#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if command -v kitchen.sh >/dev/null 2>&1 && [[ -f "$ROOT_DIR/pentaho/jobs/jb_master_unsw_dw.kjb" ]]; then
    kitchen.sh -file="$ROOT_DIR/pentaho/jobs/jb_master_unsw_dw.kjb" -level=Basic
else
    echo "Pentaho Kitchen not found; running the repository SQL/Python ETL fallback."
    source .venv/bin/activate
    python -m src.etl.load_staging
    docker exec -i unsw-postgres psql -U unsw -d unsw_dw -v ON_ERROR_STOP=1 < sql/03_load_dimensions.sql
    docker exec -i unsw-postgres psql -U unsw -d unsw_dw -v ON_ERROR_STOP=1 < sql/04_load_fact.sql
fi

source .venv/bin/activate
python - <<'PY'
import psycopg2
conn = psycopg2.connect(host="localhost", port=5432, dbname="unsw_dw", user="unsw", password="unsw_password")
with conn, conn.cursor() as cur:
    cur.execute("""
        SELECT 'staging', count(*) FROM stg_network_flow
        UNION ALL SELECT 'fact', count(*) FROM fact_network_flow
        UNION ALL SELECT 'hosts', count(*) FROM dim_host
        UNION ALL SELECT 'protocols', count(*) FROM dim_protocol_service
        UNION ALL SELECT 'attacks', count(*) FROM dim_attack_classification
    """)
    for row in cur.fetchall():
        print(f"{row[0]}: {row[1]:,}")
conn.close()
PY
