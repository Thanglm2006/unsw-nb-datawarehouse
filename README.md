# UNSW-NB15 Data Warehouse

Kho dữ liệu phân tích lưu lượng mạng UNSW-NB15 theo mô hình Kimball Star Schema. Pentaho Data Integration (PDI) là thành phần trung tâm của ETL; PostgreSQL lưu trữ; FastAPI cung cấp API; React hiển thị dashboard.

## Pipeline chính

```text
4 CSV raw
  -> Pentaho tr_staging_clean_raw.ktr
  -> stg_network_flow
  -> Pentaho tr_load_dimensions.ktr
  -> Pentaho tr_load_fact_flow.ktr
  -> Pentaho tr_refresh_analytics.ktr
  -> FastAPI
  -> React
```

Python không nằm trong đường chạy ETL. API có thể chạy bằng Docker; chỉ cần Python nếu chạy FastAPI trực tiếp ngoài Docker.

## Cấu trúc

```text
data/raw/                         # 4 file CSV, không commit vào Git
data/metadata/                    # metadata 49 trường
pentaho/jobs/jb_master_unsw_dw.kjb
pentaho/transformations/
  tr_check_connection.ktr        # kiểm tra PostgreSQL
  tr_staging_clean_raw.ktr        # CSV -> staging, làm sạch bằng PDI
  tr_load_dimensions.ktr         # staging -> dimensions
  tr_load_fact_flow.ktr          # dimensions -> fact
  tr_refresh_analytics.ktr       # refresh views + kiểm tra row count
sql/01_staging_tables.sql
sql/02_star_schema_ddl.sql
sql/03_load_dimensions.sql
sql/04_load_fact.sql
sql/05_analytical_views.sql
backend/app.py                   # FastAPI read layer
frontend/                        # React dashboard
```

## Cài đặt

1. Docker Engine/Desktop và Docker Compose.
2. Pentaho Data Integration, gồm Spoon và Kitchen.
3. Java tương thích với đúng phiên bản PDI. Java 21 chỉ dùng nếu bản PDI đang cài khởi động được với Java 21.
4. PostgreSQL JDBC driver trong thư mục `data-integration/lib` nếu bản PDI chưa có.
5. Node.js LTS và npm nếu chạy frontend ngoài Docker.

Python và `~/venv` chỉ cần nếu chạy API ngoài Docker.

Spoon và Kitchen nằm trong cùng bộ Pentaho Data Integration, không cần tải hai bộ riêng. Spoon dùng để thiết kế/kiểm tra `.ktr` và `.kjb`; Kitchen dùng để chạy `.kjb` bằng command line.

Kiểm tra PDI:

```bash
java -version
spoon || spoon.sh
kitchen -version || kitchen.sh -version
```

## Khởi động PostgreSQL và API

```bash
cp .env.example .env
docker compose up -d postgres api
docker compose ps
```

Nếu cổng `5432` đã bị chiếm, đổi `POSTGRES_PORT` trong `.env` và dùng cổng đó khi tạo connection PostgreSQL trong Spoon.

Các script trong `docker-entrypoint-initdb.d` chỉ chạy khi volume mới được tạo. Nếu cần khởi tạo lại schema:

```bash
docker compose down -v
docker compose up -d postgres api
```

Không dùng `down -v` nếu cần giữ dữ liệu hiện tại.

## Chạy Pentaho ETL

Đặt raw files tại `data/raw/UNSW-NB15_[1-4].csv` và đặt biến PDI:

```text
RAW_DATA_DIR=/absolute/path/to/DW/data/raw
```

Trong Spoon, tạo PostgreSQL connection tới `localhost:5432`, database `unsw_dw`, user `unsw`, password `unsw_password`. Sau khi preview và chạy thử một file nhỏ:

```bash
./pentaho/run_unsw_etl.sh
```

Hoặc:

```bash
kitchen.sh -file=/absolute/path/to/DW/pentaho/jobs/jb_master_unsw_dw.kjb -level=Basic
```

Master Job sẽ thất bại nếu số dòng staging và fact không bằng nhau.

## Pentaho xử lý dữ liệu như thế nào

`tr_staging_clean_raw.ktr` gồm ba nhóm step:

1. `CSV file input`: đọc CSV không header, khai báo đủ 49 trường và đọc ban đầu dưới dạng chuỗi để không lỗi ở port Hex hoặc ô rỗng.
2. `Modified JavaScript Value`: trim chuỗi, chuyển Hex port, gán `-1` cho giá trị không phải port, impute counter, chuẩn hóa `service`/`attack_cat`, chuyển epoch thành datetime và sinh `date_key`/`time_key`.
3. `Table output`: ghi các field đã ép kiểu vào `stg_network_flow` theo batch 10.000 dòng.

`tr_load_dimensions.ktr` và `tr_load_fact_flow.ktr` chạy SQL set-based. Dimension được tạo trước, sau đó fact lookup surrogate key. `tr_refresh_analytics.ktr` refresh materialized views và kiểm tra `staging_count = fact_count`.

Dòng lỗi không được âm thầm bỏ qua: Table Output đang để chế độ fail-fast. Bảng `stg_network_flow_reject` đã được chuẩn bị để nối error hop khi cần lưu reject thay vì dừng toàn bộ batch.

## Chạy backend và frontend

```bash
source ~/venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app:app --reload --port 8000
```

Trong terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite proxy `/api` tới `http://localhost:8000`.

## Kiểm tra sau ETL

```bash
docker compose exec postgres psql -U unsw -d unsw_dw -c "SELECT count(*) AS staging FROM stg_network_flow; SELECT count(*) AS fact FROM fact_network_flow;"
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/metrics/overview
```

## Người vận hành cần tự xác nhận

- PDI và Java tương thích.
- PostgreSQL connection và CSV preview trong Spoon.
- Chạy thử một file/sample trước khi chạy 2.54M dòng.
- Số dòng staging/fact và số dòng reject.
- Thời gian chạy full ETL.

Các file `.ktr` và `.kjb` đã được lưu sẵn; không cần kéo thả lại mỗi lần chạy.
