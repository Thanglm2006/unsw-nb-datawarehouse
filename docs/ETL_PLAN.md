# DuckDB ETL Plan

## Pipeline

```text
4 CSV raw
  -> DuckDB read_csv
  -> DuckDB SQL cleaning + validation
  -> PostgreSQL staging via COPY
  -> PostgreSQL dimensions
  -> PostgreSQL fact
  -> Materialized views
  -> FastAPI
  -> React
```

## ETL components

- `etl/run_etl.py`: full reload orchestration.
- `etl/clean_staging.sql`: type conversion and data-quality rules.
- `sql/03_load_dimensions.sql`: load dimensions.
- `sql/04_load_fact.sql`: lookup surrogate keys and load fact.
- `sql/06_refresh_analytics.sql`: refresh materialized views.
- `etl_run_audit`: audit status, row counts and quality metrics.

## DuckDB processing

DuckDB reads all four CSV files as VARCHAR first. This prevents parsing failures caused by Hex ports and blank values. The cleaning SQL then:

- converts Hex/decimal ports and maps invalid/non-port values to `-1`;
- converts numeric measures with `try_cast`;
- fills HTTP/FTP counters with `0`;
- maps missing service to `unknown`;
- normalizes attack labels;
- converts Unix epoch to UTC timestamps;
- creates `date_key` and `time_key`.

DuckDB exports the cleaned relation to a temporary CSV and PostgreSQL loads it with `COPY`.

## Run modes

Host Python:

```bash
source ~/venv/bin/activate
pip install -r etl/requirements.txt
python -m etl.run_etl --raw-dir data/raw
```

Docker:

```bash
docker compose up -d postgres
docker compose run --rm etl
```

The ETL fails when source, staging and fact row counts do not match. Each run is recorded in `etl_run_audit` and shown on the ETL dashboard page.

## Reporting outline

1. Raw dataset profiling.
2. DuckDB extraction and cleaning rules.
3. PostgreSQL staging design.
4. Dimension and fact loading.
5. Analytical views.
6. ETL validation and audit.
7. FastAPI serving layer.
8. React dashboard and metrics.
