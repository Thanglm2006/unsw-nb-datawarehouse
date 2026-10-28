"""Run the DuckDB -> PostgreSQL UNSW-NB15 full reload."""

from __future__ import annotations

import argparse
import glob
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import psycopg


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


def run(raw_dir: Path, sample_limit: int | None = None) -> dict[str, object]:
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
    build_raw_relation(duck, raw_files)
    source_rows = duck.execute("SELECT count(*) FROM raw_flows").fetchone()[0]
    duck.execute((ROOT / "etl/clean_staging.sql").read_text(encoding="utf-8"))
    clean_query = "SELECT " + ", ".join(STAGING_COLUMNS) + " FROM cleaned_flows"
    if sample_limit:
        clean_query += f" LIMIT {int(sample_limit)}"
    cleaned_rows = duck.execute(f"SELECT count(*) FROM ({clean_query})").fetchone()[0]
    if sample_limit is None and source_rows != cleaned_rows:
        raise RuntimeError(f"DuckDB row count mismatch: source={source_rows}, cleaned={cleaned_rows}")

    with tempfile.NamedTemporaryFile(prefix="unsw-clean-", suffix=".csv", delete=False) as temp:
        clean_csv = Path(temp.name)
    try:
        duck.execute(
            f"COPY ({clean_query}) TO {sql_literal(str(clean_csv))} "
            "(FORMAT CSV, HEADER false, NULL '')"
        )
        with psycopg.connect(dsn) as connection:
            connection.execute(
                """
                INSERT INTO etl_run_audit (run_id, started_at, status, source_rows)
                VALUES (%s, %s, 'running', %s)
                """,
                (run_id, started_at, source_rows),
            )
            connection.commit()
            try:
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
                    sql = sql_path.read_text(encoding="utf-8")
                    sql = sql.replace("BEGIN;", "").replace("COMMIT;", "")
                    connection.execute(sql)
                    connection.commit()

                quality = connection.execute(
                    """
                    SELECT jsonb_build_object(
                        'unknown_service_rows', count(*) FILTER (WHERE service = 'unknown'),
                        'non_port_source_rows', count(*) FILTER (WHERE sport = -1),
                        'non_port_dest_rows', count(*) FILTER (WHERE dsport = -1),
                        'attack_rows', count(*) FILTER (WHERE label = 1),
                        'normal_rows', count(*) FILTER (WHERE label = 0)
                    ) FROM stg_network_flow
                    """
                ).fetchone()[0]
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
                    (staging_rows, fact_rows, json.dumps(quality), run_id),
                )
                connection.commit()
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
