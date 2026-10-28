"""Load the cleaned UNSW-NB15 Parquet dataset into PostgreSQL staging."""

import io
import os

import pyarrow.parquet as pq
import psycopg2


PARQUET_PATH = os.getenv(
    "UNSW_PARQUET_PATH", "data/processed/unsw_nb15_cleaned.parquet"
)
DB_CONFIG = {
    "host": os.getenv("PGHOST", "localhost"),
    "port": int(os.getenv("PGPORT", "5432")),
    "dbname": os.getenv("PGDATABASE", "unsw_dw"),
    "user": os.getenv("PGUSER", "unsw"),
    "password": os.getenv("PGPASSWORD", "unsw_password"),
}

STAGING_COLUMNS = {
    "srcip", "sport", "dstip", "dsport", "proto", "state", "dur", "sbytes",
    "dbytes", "sttl", "dttl", "sloss", "dloss", "service", "sload", "dload",
    "spkts", "dpkts", "swin", "dwin", "stcpb", "dtcpb", "smeansz", "dmeansz",
    "trans_depth", "res_bdy_len", "sjit", "djit", "stime", "ltime",
    "start_datetime", "last_datetime", "date_key", "time_key", "sinpkt",
    "dinpkt", "tcprtt", "synack", "ackdat", "is_sm_ips_ports", "ct_state_ttl",
    "ct_flw_http_mthd", "is_ftp_login", "ct_ftp_cmd", "ct_srv_src", "ct_srv_dst",
    "ct_dst_ltm", "ct_src_ltm", "ct_src_dport_ltm", "ct_dst_sport_ltm",
    "ct_dst_src_ltm", "attack_cat", "label",
}


def load_staging() -> int:
    parquet = pq.ParquetFile(PARQUET_PATH)
    source_names = parquet.schema_arrow.names
    source_by_lower = {name.lower(): name for name in source_names}
    target_aliases = {"sinpkt": "sintpkt", "dinpkt": "dintpkt"}
    available_targets = set(source_by_lower)
    available_targets.update(target for target, source_name in target_aliases.items() if source_name in source_by_lower)
    columns = sorted(STAGING_COLUMNS & available_targets)
    missing = STAGING_COLUMNS - available_targets
    if missing:
        raise RuntimeError(f"Missing staging columns in Parquet: {sorted(missing)}")

    connection = psycopg2.connect(**DB_CONFIG)
    total = 0
    try:
        with connection:
            with connection.cursor() as cursor:
                cursor.execute("TRUNCATE TABLE stg_network_flow RESTART IDENTITY")
                column_sql = ", ".join(f'"{name}"' for name in columns)
                copy_sql = f"COPY stg_network_flow ({column_sql}) FROM STDIN WITH (FORMAT CSV)"

                for batch in parquet.iter_batches(batch_size=50_000):
                    frame = batch.to_pandas()
                    frame.columns = [name.lower() for name in frame.columns]
                    frame = frame.rename(columns={"sintpkt": "sinpkt", "dintpkt": "dinpkt"})
                    buffer = io.StringIO()
                    frame.loc[:, columns].to_csv(buffer, index=False, header=False)
                    buffer.seek(0)
                    cursor.copy_expert(copy_sql, buffer)
                    total += len(frame)
        return total
    finally:
        connection.close()


if __name__ == "__main__":
    print(f"Loaded {load_staging():,} staging rows")
