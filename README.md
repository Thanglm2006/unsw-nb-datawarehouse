# UNSW-NB15 Data Warehouse

Kho dữ liệu phân tích lưu lượng mạng UNSW-NB15 theo mô hình Kimball Star Schema.

- DuckDB: đọc và làm sạch CSV bằng SQL.
- PostgreSQL: staging, dimensions, fact và analytical views.
- FastAPI: REST API và server-side filtering/pagination.
- React/Vite/Recharts: dashboard và ETL/Data Quality page.

## Pipeline

```text
4 CSV raw
  -> DuckDB SQL ETL
  -> PostgreSQL staging
  -> dimensions + fact
  -> materialized views
  -> FastAPI
  -> React
```

ETL được triển khai bằng DuckDB SQL và nạp trực tiếp vào PostgreSQL.

## Cấu trúc chính

```text
etl/
  run_etl.py              # DuckDB -> PostgreSQL full reload
  clean_staging.sql       # cleaning rules
  requirements.txt
sql/
  01_staging_tables.sql
  02_star_schema_ddl.sql
  03_load_dimensions.sql
  04_load_fact.sql
  05_analytical_views.sql
  06_refresh_analytics.sql
backend/app.py            # API
frontend/src/
  api/                    # API client modules
  config.js               # API base URL
  pages/                  # DashboardPage, ETLPage
  components/             # charts and UI
```

Chi tiết ETL: [ETL_PLAN.md](ETL_PLAN.md).

## Yêu cầu

- Docker và Docker Compose.
- Python 3.11+ nếu chạy ETL ngoài Docker.
- Node.js LTS và npm cho frontend.
- Python chỉ cần khi chạy ETL ngoài Docker hoặc phát triển backend ngoài Docker.

Kiểm tra nhanh:

```bash
docker --version
docker compose version
python3 --version
node --version
npm --version
```

## Chuẩn bị dữ liệu

Đặt bốn file raw vào:

```text
data/raw/UNSW-NB15_1.csv
data/raw/UNSW-NB15_2.csv
data/raw/UNSW-NB15_3.csv
data/raw/UNSW-NB15_4.csv
```

Các file CSV không commit vào Git.

## Khởi động PostgreSQL và API

```bash
cp .env.example .env
docker compose up -d postgres api
docker compose ps
```

Kiểm tra API:

```bash
curl http://localhost:8009/health
```

API phải trả về trạng thái `ok` trước khi chạy ETL.

Nếu cổng PostgreSQL `5437` bị chiếm, sửa `POSTGRES_PORT` trong `.env`. API container vẫn kết nối PostgreSQL qua network Docker.

## Chạy toàn bộ project bằng một lệnh

Trên Ubuntu, có thể dùng script bootstrap:

```bash
chmod +x run_project.sh stop_project.sh
./run_project.sh
```

Script sẽ kiểm tra raw files, khởi động PostgreSQL/API, chờ API healthy, cài frontend dependencies nếu thiếu, mở Vite ngay và chạy DuckDB ETL trong container song song. Dashboard có thể mở trong lúc ETL đang chạy; trang ETL hiển thị trạng thái audit.

Các cổng mặc định:

```text
PostgreSQL: localhost:5437
API:        http://localhost:8009
Frontend:   http://localhost:5175
```

Dừng Docker services:

```bash
./stop_project.sh
```

## Chạy ETL bằng Docker

Đây là cách khuyến nghị:

```bash
docker compose run --build etl
docker compose rm -f etl
```

Service ETL đọc `data/raw` ở chế độ read-only, dùng DuckDB làm sạch và nạp PostgreSQL. Sau khi chạy xong, kiểm tra:

ETL in progress theo từng phase và elapsed time; bước fact có thể mất vài phút vì PostgreSQL phải nạp 2.54M dòng vào bảng partitioned và các index.

```bash
docker compose exec postgres psql -U unsw -d unsw_dw -c "SELECT count(*) AS staging FROM stg_network_flow; SELECT count(*) AS fact FROM fact_network_flow;"
curl http://localhost:8009/api/v1/etl/status
```

## Chạy ETL ngoài Docker

```bash
source ~/venv/bin/activate
pip install -r etl/requirements.txt
python -m etl.run_etl --raw-dir data/raw
```

Có thể chạy sample trước:

```bash
python -m etl.run_etl --raw-dir data/raw --sample-limit 50000
```

Full ETL sẽ:

1. Đọc bốn CSV bằng DuckDB.
2. Làm sạch và ép kiểu bằng `etl/clean_staging.sql`.
3. Ghi staging bằng PostgreSQL `COPY`.
4. Nạp dimensions và fact bằng SQL.
5. Refresh materialized views.
6. Ghi trạng thái vào `etl_run_audit`.
7. Fail nếu source/staging/fact không khớp số dòng.

## Chạy frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5175`.

API base URL cấu hình tại `frontend/.env`:

```env
VITE_API_BASE_URL=https://dw-api.caelestial.store
```

Khi chạy local không tunnel, đặt `VITE_API_BASE_URL=` để Vite proxy tới `http://localhost:8009`. Khi tunnel frontend, dùng `https://dw-api.caelestial.store`.

Với tunnel hiện tại:

```text
Frontend: https://dw.caelestial.store
Backend:  https://dw-api.caelestial.store
```

`FRONTEND_ORIGINS` đã cho phép cả `http://localhost:5175` và `https://dw.caelestial.store` để dùng được local lẫn tunnel.

Frontend gồm:

- Dashboard: KPI, attack distribution, timeline, hourly profile, protocol/service, port profile, top IP, flow search.
- ETL & Data Quality: pipeline status, audit history, row counts, reject rows và quality metrics.

## API chính

```text
GET /api/v1/metrics/overview
GET /api/v1/metrics/traffic
GET /api/v1/metrics/protocol-volume
GET /api/v1/metrics/ports
GET /api/v1/attacks/distribution
GET /api/v1/traffic/timeseries
GET /api/v1/flows/search
GET /api/v1/etl/status
GET /api/v1/etl/runs
```

## Khởi tạo lại database

Các file trong `docker-entrypoint-initdb.d` chỉ chạy khi volume mới được tạo. Nếu cần reset database:

```bash
docker compose down -v
docker compose up -d postgres api
docker compose run --rm etl
```

Lệnh này xóa dữ liệu PostgreSQL hiện tại.

## Kiểm thử

```bash
python -m compileall backend etl
docker compose config
git diff --check
```
