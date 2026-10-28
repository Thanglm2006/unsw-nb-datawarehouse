#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "Created .env from .env.example. Review RAW_DATA_DIR if running ETL outside Docker."
fi

set -a
source .env
set +a

: "${POSTGRES_PORT:=5437}"
: "${BACKEND_PORT:=8009}"
: "${FRONTEND_PORT:=5175}"

for command_name in docker npm curl; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Missing command: $command_name" >&2
        exit 1
    fi
done

if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose plugin is required." >&2
    exit 1
fi

for file_name in UNSW-NB15_1.csv UNSW-NB15_2.csv UNSW-NB15_3.csv UNSW-NB15_4.csv; do
    if [[ ! -f "$ROOT_DIR/data/raw/$file_name" ]]; then
        echo "Missing raw file: data/raw/$file_name" >&2
        exit 1
    fi
done

echo "Starting PostgreSQL on localhost:${POSTGRES_PORT} and API on localhost:${BACKEND_PORT}..."
docker compose up -d postgres api

echo "Waiting for API..."
for attempt in {1..30}; do
    if curl --silent --fail "http://localhost:${BACKEND_PORT}/health" >/dev/null; then
        break
    fi
    if [[ "$attempt" == 30 ]]; then
        echo "API did not become healthy on port ${BACKEND_PORT}." >&2
        docker compose logs --tail=80 api >&2 || true
        exit 1
    fi
    sleep 2
done

if [[ ! -x frontend/node_modules/.bin/vite ]]; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
fi

echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "API:      http://localhost:${BACKEND_PORT}"

echo "Starting frontend before ETL..."
(
    cd frontend
    npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

cleanup() {
    kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Running DuckDB ETL in the background container..."
docker compose run --build etl
docker compose rm -f etl >/dev/null 2>&1 || true

echo "ETL completed. Press Ctrl+C to stop the frontend. Use ./stop_project.sh to stop Docker services."
cd frontend
wait "$FRONTEND_PID"
