"""Run the DuckDB -> PostgreSQL UNSW-NB15 full reload."""

from __future__ import annotations

import argparse
import glob
import json
import os
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import psycopg
from psycopg.types.json import Jsonb


ROOT = Path(__file__).resolve().parents[1]
RAW_COLUMNS = (
    "srcip", "sport", "dstip", "dsport", "proto", "state", "dur", "sbytes",
    "dbytes", "sttl", "dttl", "sloss", "dloss", "service", "sload", "dload",
    "spkts", "dpkts", "swin", "dwin", "stcpb", "dtcpb", "smeansz", "dmeansz",
    "trans_depth", "res_bdy_len", "sjit", "djit", "stime", "ltime", "sinpkt",
    "dinpkt", "tcprtt", "synack", "ackdat", "is_sm_ips_ports", "ct_state_ttl",
    "ct_flw_http_mthd", "is_ftp_login", "ct_ftp_cmd", "ct_srv_src", "ct_srv_dst",
    "ct_dst_ltm", "ct_src_ltm", "ct_src_dport_ltm", "ct_dst_sport_ltm",
    "ct_dst_src_ltm", "attack_cat", "label",
)
STAGING_COLUMNS = (
    "srcip", "sport", "dstip", "dsport", "proto", "state", "dur", "sbytes",
    "dbytes", "sttl", "dttl", "sloss", "dloss", "service", "sload", "dload",
    "spkts", "dpkts", "swin", "dwin", "stcpb", "dtcpb", "smeansz", "dmeansz",
    "trans_depth", "res_bdy_len", "sjit", "djit", "stime", "ltime",
    "start_datetime", "last_datetime", "date_key", "time_key", "sinpkt", "dinpkt",
    "tcprtt", "synack", "ackdat", "is_sm_ips_ports", "ct_state_ttl",
    "ct_flw_http_mthd", "is_ftp_login", "ct_ftp_cmd", "ct_srv_src", "ct_srv_dst",
    "ct_dst_ltm", "ct_src_ltm", "ct_src_dport_ltm", "ct_dst_sport_ltm",
    "ct_dst_src_ltm", "attack_cat", "label",
)
QUALITY_RULES = [
    {"field": "sport / dsport", "problem": "Hex, '-', rỗng hoặc ngoài dải port", "action": "Chuyển số; non-port thành -1"},
    {"field": "ct_flw_http_mthd / is_ftp_login / ct_ftp_cmd", "problem": "Blank counter", "action": "Điền 0"},
    {"field": "service", "problem": "'-' hoặc rỗng", "action": "Chuẩn hóa thành unknown"},
    {"field": "attack_cat", "problem": "NULL, khoảng trắng, Backdoors", "action": "Normal / trim / Backdoor"},
    {"field": "Stime / Ltime", "problem": "Unix epoch", "action": "UTC timestamp + date_key/time_key"},
    {"field": "numeric fields", "problem": "Chuỗi hoặc giá trị lỗi", "action": "try_cast và giữ NULL khi không hợp lệ"},
]


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def postgres_dsn() -> str:
    return os.getenv(
        "DATABASE_URL",
        "postgresql://{user}:{password}@{host}:{port}/{database}".format(
            user=os.getenv("PGUSER", "unsw"),
            password=os.getenv("PGPASSWORD", "unsw_password"),
            host=os.getenv("PGHOST", "localhost"),
            port=os.getenv("PGPORT", os.getenv("POSTGRES_PORT", "5432")),
            database=os.getenv("PGDATABASE", "unsw_dw"),
        ),
    )


def build_raw_relation(connection: duckdb.DuckDBPyConnection, raw_files: list[str]) -> None:
    columns = "{" + ", ".join(f"'{name}': 'VARCHAR'" for name in RAW_COLUMNS) + "}"
    relations = []
    for path in raw_files:
        relations.append(
            "SELECT * FROM read_csv(" 
            f"{sql_literal(path)}, header=false, columns={columns}, "
            "delim=',', quote='\"', null_padding=true, strict_mode=false)"
        )
    connection.execute(
        "CREATE OR REPLACE TEMP VIEW raw_flows AS " + " UNION ALL ".join(relations)
    )


def collect_before_quality(connection: duckdb.DuckDBPyConnection) -> dict[str, int]:
    row = connection.execute(
        """
        SELECT count(*) AS rows,
               count(*) FILTER (WHERE nullif(trim(ct_flw_http_mthd), '') IS NULL) AS missing_http,
               count(*) FILTER (WHERE nullif(trim(is_ftp_login), '') IS NULL) AS missing_ftp_login,
               count(*) FILTER (WHERE nullif(trim(ct_ftp_cmd), '') IS NULL) AS missing_ftp_cmd,
               count(*) FILTER (WHERE trim(service) = '-') AS service_dash,
               count(*) FILTER (WHERE nullif(trim(attack_cat), '') IS NULL) AS attack_null,
               count(*) FILTER (WHERE lower(trim(sport)) LIKE '0x%') AS sport_hex,
               count(*) FILTER (WHERE lower(trim(dsport)) LIKE '0x%') AS dsport_hex,
               count(*) FILTER (WHERE trim(sport) = '-' OR try_cast(sport AS BIGINT) IS NULL OR try_cast(sport AS BIGINT) NOT BETWEEN 0 AND 65535) AS sport_invalid,
               count(*) FILTER (WHERE trim(dsport) = '-' OR try_cast(dsport AS BIGINT) IS NULL OR try_cast(dsport AS BIGINT) NOT BETWEEN 0 AND 65535) AS dsport_invalid,
               count(DISTINCT nullif(trim(attack_cat), '')) AS attack_variants
        FROM raw_flows
        """
    ).fetchone()
    keys = [
        "rows", "missing_http", "missing_ftp_login", "missing_ftp_cmd", "service_dash",
        "attack_null", "sport_hex", "dsport_hex", "sport_invalid", "dsport_invalid", "attack_variants",
    ]
    return {key: int(value or 0) for key, value in zip(keys, row)}


def run(raw_dir: Path, sample_limit: int | None = None) -> dict[str, object]:
    started_clock = time.perf_counter()
    def log(message: str) -> None:
        elapsed = time.perf_counter() - started_clock
        print(f"[ETL +{elapsed:7.1f}s] {message}", flush=True)

    raw_files = sorted(glob.glob(str(raw_dir / "UNSW-NB15_[1-4].csv")))
    if len(raw_files) != 4:
        raise FileNotFoundError(
            f"Expected 4 raw files in {raw_dir}, found {len(raw_files)}"
        )

    run_id = uuid.uuid4()
    started_at = datetime.now(timezone.utc)
    dsn = postgres_dsn()
    duck = duckdb.connect()
    duck.execute("SET TimeZone='UTC'")
    log(f"Reading {len(raw_files)} CSV files with DuckDB")
    build_raw_relation(duck, raw_files)
    source_rows = duck.execute("SELECT count(*) FROM raw_flows").fetchone()[0]
    log(f"Source rows: {source_rows:,}")
    before_quality = collect_before_quality(duck)
    log("Cleaning and typing staging relation")
    duck.execute((ROOT / "etl/clean_staging.sql").read_text(encoding="utf-8"))
    clean_query = "SELECT " + ", ".join(STAGING_COLUMNS) + " FROM cleaned_flows"
    if sample_limit:
        clean_query += f" LIMIT {int(sample_limit)}"
    cleaned_rows = duck.execute(f"SELECT count(*) FROM ({clean_query})").fetchone()[0]
    if sample_limit is None and source_rows != cleaned_rows:
        raise RuntimeError(f"DuckDB row count mismatch: source={source_rows}, cleaned={cleaned_rows}")
    log(f"Cleaned rows: {cleaned_rows:,}")

    with tempfile.NamedTemporaryFile(prefix="unsw-clean-", suffix=".csv", delete=False) as temp:
        clean_csv = Path(temp.name)
    try:
        log("Exporting cleaned rows to temporary CSV")
        duck.execute(
            f"COPY ({clean_query}) TO {sql_literal(str(clean_csv))} "
            "(FORMAT CSV, HEADER false, NULL '')"
        )
        with psycopg.connect(dsn) as connection:
            log("Connecting to PostgreSQL")
            connection.execute(
                """
                INSERT INTO etl_run_audit (run_id, started_at, status, source_rows)
                VALUES (%s, %s, 'running', %s)
                """,
                (run_id, started_at, source_rows),
            )
            connection.commit()
            try:
                log("Loading PostgreSQL staging with COPY")
                column_sql = ", ".join(STAGING_COLUMNS)
                with connection.cursor() as cursor:
                    cursor.execute("TRUNCATE TABLE stg_network_flow RESTART IDENTITY")
                    with cursor.copy(
                        f"COPY stg_network_flow ({column_sql}) FROM STDIN WITH (FORMAT CSV, NULL '')"
                    ) as copy, clean_csv.open("rb") as source:
                        while chunk := source.read(1024 * 1024):
                            copy.write(chunk)
                connection.commit()

                for sql_path in (
                    ROOT / "sql/03_load_dimensions.sql",
                    ROOT / "sql/04_load_fact.sql",
                    ROOT / "sql/06_refresh_analytics.sql",
                ):
                    log(f"Running {sql_path.name}")
                    sql = sql_path.read_text(encoding="utf-8")
                    sql = sql.replace("BEGIN;", "").replace("COMMIT;", "")
                    connection.execute(sql)
                    connection.commit()

                after_row = connection.execute(
                    """
                    SELECT count(*) AS rows,
                           count(*) FILTER (WHERE service = 'unknown') AS unknown_service_rows,
                           count(*) FILTER (WHERE sport = -1) AS non_port_source_rows,
                           count(*) FILTER (WHERE dsport = -1) AS non_port_dest_rows,
                           count(*) FILTER (WHERE attack_cat IS NULL) AS attack_null,
                           count(*) FILTER (WHERE ct_flw_http_mthd IS NULL) AS missing_http,
                           count(*) FILTER (WHERE is_ftp_login IS NULL) AS missing_ftp_login,
                           count(*) FILTER (WHERE ct_ftp_cmd IS NULL) AS missing_ftp_cmd,
                           count(*) FILTER (WHERE label = 1) AS attack_rows,
                           count(*) FILTER (WHERE label = 0) AS normal_rows,
                           count(DISTINCT attack_cat) AS attack_categories
                    FROM stg_network_flow
                    """
                ).fetchone()
                after_keys = [
                    "rows", "unknown_service_rows", "non_port_source_rows", "non_port_dest_rows",
                    "attack_null", "missing_http", "missing_ftp_login", "missing_ftp_cmd",
                    "attack_rows", "normal_rows", "attack_categories",
                ]
                after_quality = {key: int(value or 0) for key, value in zip(after_keys, after_row)}
                quality = {
                    "before": before_quality,
                    "after": after_quality,
                    "rules": QUALITY_RULES,
                    "duplicates_preserved": True,
                }
                staging_rows = connection.execute("SELECT count(*) FROM stg_network_flow").fetchone()[0]
                fact_rows = connection.execute("SELECT count(*) FROM fact_network_flow").fetchone()[0]
                if staging_rows != cleaned_rows or staging_rows != fact_rows:
                    raise RuntimeError(
                        f"Row count mismatch: source={source_rows}, cleaned={cleaned_rows}, "
                        f"staging={staging_rows}, fact={fact_rows}"
                    )
                connection.execute(
                    """
                    UPDATE etl_run_audit
                    SET finished_at = now(), status = 'success', staging_rows = %s,
                        fact_rows = %s, quality = %s, message = NULL
                    WHERE run_id = %s
                    """,
                        (staging_rows, fact_rows, Jsonb(quality), run_id),
                )
                connection.commit()
                log(f"ETL success: staging={staging_rows:,}, fact={fact_rows:,}")
            except Exception as error:
                connection.rollback()
                connection.execute(
                    "UPDATE etl_run_audit SET finished_at = now(), status = 'failed', message = %s WHERE run_id = %s",
                    (str(error), run_id),
                )
                connection.commit()
                raise
    finally:
        clean_csv.unlink(missing_ok=True)
        duck.close()

    return {
        "run_id": str(run_id),
        "source_rows": source_rows,
        "staging_rows": cleaned_rows,
        "fact_rows": cleaned_rows,
        "status": "success",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Load UNSW-NB15 into PostgreSQL with DuckDB")
    parser.add_argument("--raw-dir", default=os.getenv("RAW_DATA_DIR", "data/raw"))
    parser.add_argument("--sample-limit", type=int, default=None)
    args = parser.parse_args()
    result = run(Path(args.raw_dir).resolve(), args.sample_limit)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
