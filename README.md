# DỰ ÁN KHO DỮ LIỆU AN NINH MẠNG UNSW-NB15 (DATA WAREHOUSE & BACKEND PIPELINE)

Hệ thống xử lý dữ liệu lớn (Big Data / Data Warehousing) và phát hiện xâm nhập mạng dựa trên dataset chuẩn quốc tế **UNSW-NB15** (2,540,047 bản ghi mạng). Dự án cung cấp quy trình toàn diện từ phân tích dữ liệu thô, module tiền xử lý tự động (Python Preprocessing), mô hình hóa kho dữ liệu hình sao (Kimball Star Schema), và quy trình ETL trên Pentaho Data Integration (PDI).

---

## 1. CẤU TRÚC DỰ ÁN (PROJECT DIRECTORY STRUCTURE)

```
/home/thanglm2006/DW/
├── data/
│   ├── raw/                 # Tệp dữ liệu CSV thô (Được Git ignore, không commit)
│   │   ├── UNSW-NB15_1.csv
│   │   ├── UNSW-NB15_2.csv
│   │   ├── UNSW-NB15_3.csv
│   │   ├── UNSW-NB15_4.csv
│   │   ├── UNSW_NB15_training-set.csv
│   │   └── UNSW_NB15_testing-set.csv
│   ├── metadata/            # Siêu dữ liệu danh mục trường và sự kiện
│   │   ├── NUSW-NB15_features.csv
│   │   └── UNSW-NB15_LIST_EVENTS.csv
│   └── processed/           # Kết quả sau tiền xử lý (Parquet/Cleaned CSV)
│       └── .gitkeep
│
├── docs/                    # Tài liệu kỹ thuật dự án
│   ├── RAW_DATA_ANALYSIS.md       # Báo cáo phân tích sâu dữ liệu thô
│   ├── PENTAHO_ETL_PLAN.md        # Kế hoạch & Guide thiết kế Pentaho PDI
│   ├── PREPROCESSING_PROCESS.md   # Quy trình chi tiết & cách chạy tiền xử lý
│   ├── before_after_preprocessing.png # Biểu đồ so sánh Trước vs Sau xử lý
│   └── cleaned_data_overview.png  # Biểu đồ tổng quan đặc tính dữ liệu sạch
│
├── pentaho/                 # Các artifacts của Pentaho Data Integration (PDI)
│   ├── jobs/                # Các file Master Job (*.kjb)
│   │   └── .gitkeep
│   └── transformations/     # Các file Transformation (*.ktr)
│       └── .gitkeep
│
├── sql/                     # Kịch bản DDL Cơ sở dữ liệu & Kho dữ liệu
│   ├── 01_staging_tables.sql      # DDL bảng Staging stg_network_flow
│   └── 02_star_schema_ddl.sql     # DDL Star Schema (5 Dimension + 1 Partitioned Fact)
│
├── src/                     # Mã nguồn Backend & ETL Pipeline
│   ├── preprocessing/       # Module làm sạch dữ liệu tự động
│   │   ├── __init__.py
│   │   ├── cleaner.py       # Pipeline xử lý Hex port, Impute, Datetime, String
│   │   └── plotter.py       # Module trực quan hóa Before/After & Cleaned Data
│   └── database/            # Quản lý kết nối Database
│
├── tests/                   # Bộ kiểm thử tự động (Unit Tests)
│   └── test_preprocessing.py
│
├── .gitignore               # Cấu hình bỏ qua tệp dữ liệu lớn (>500MB)
├── requirements.txt         # Khai báo các thư viện phụ thuộc (Dependencies)
├── RAW_DATA_ANALYSIS.md     # Bản phân tích dữ liệu thô (gốc)
├── PENTAHO_ETL_PLAN.md      # Kế hoạch ETL Pentaho (gốc)
├── PREPROCESSING_PROCESS.md # Quy trình tiền xử lý dữ liệu & Hướng dẫn chạy (gốc)
└── README.md                # Tài liệu tổng quan & Hướng dẫn vận hành
```

---

## 2. HỆ THỐNG TÀI LIỆU CỐT LÕI (DOCUMENTATION)

1. **[RAW_DATA_ANALYSIS.md](RAW_DATA_ANALYSIS.md)**: Phân tích chi tiết quy mô 2.54M dòng, mất cân bằng nhãn (87.35% Normal vs 12.65% Attack), ô nhiễm kiểu dữ liệu ở cổng (`sport`, `dsport` chứa Hex `0x000b` và `-`), dữ liệu khuyết HTTP/FTP (53% - 56%), và chuỗi nhãn không đồng nhất.
2. **[PENTAHO_ETL_PLAN.md](PENTAHO_ETL_PLAN.md)**: Thiết kế luồng Master Job (`jb_master_unsw_dw.kjb`) và 3 Transformation tuần tự (`tr_staging_clean_raw.ktr`, `tr_load_dimensions.ktr`, `tr_load_fact_flow.ktr`), kèm cấu hình chi tiết từng Step và phương pháp tối ưu In-memory caching.
3. **[PREPROCESSING_PROCESS.md](PREPROCESSING_PROCESS.md)**: Quy trình tiền xử lý dữ liệu chi tiết, phân tích kỹ thuật từng bước chuyển đổi và hướng dẫn các cách chạy pipeline và biểu đồ.

---

## 3. HƯỚNG DẪN CLONE REPOSITORY (CLONE REPO)

Để tải toàn bộ mã nguồn dự án về máy:

```bash
git clone https://github.com/Thanglm2006/unsw-nb-datawarehouse.git
cd unsw-nb-datawarehouse
```

---

## 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY MODULE TIỀN XỬ LÝ (SETUP & EXECUTION)

### Cài đặt thư viện phụ thuộc:
```bash
pip install -r requirements.txt
```

### Chạy Unit Test kiểm tra tính đúng đắn của bộ lọc:
```bash
python3 -m unittest tests/test_preprocessing.py
```

### Chạy Pipeline làm sạch dữ liệu:
```bash
# Sử dụng môi trường ảo venv có sẵn
~/venv/bin/python -m src.preprocessing.cleaner
```
Kết quả được xuất ra định dạng nén Parquet hiệu năng cao tại: `data/processed/unsw_nb15_cleaned.parquet`.

### Chạy Module sinh biểu đồ phân tích (Plotter):
```bash
~/venv/bin/python -m src.preprocessing.plotter
```
Sinh tự động 2 biểu đồ phân tích chất lượng dữ liệu:
* `docs/before_after_preprocessing.png`: Biểu đồ so sánh Trước vs Sau khi tiền xử lý.
* `docs/cleaned_data_overview.png`: Biểu đồ phân tích tổng quan đặc tính tập dữ liệu sạch.

---

## 5. CẤU TRÚC BẢNG ĐÍCH TRONG KHO DỮ LIỆU CHO PENTAHO (TARGET DW SCHEMA)

Pentaho Data Integration (PDI) là công cụ ETL đóng vai trò trích xuất và biến đổi dữ liệu. Dữ liệu sau khi qua Pentaho sẽ được **nạp vào Cơ sở dữ liệu đích (Target Database / Data Warehouse)** thông qua kết nối **JDBC** trong step `Table Output`.

Các kịch bản DDL trong thư mục `sql/` được sử dụng để khởi tạo cấu trúc bảng trên CSDL đích trước khi chạy Pentaho:
* [sql/01_staging_tables.sql](sql/01_staging_tables.sql): Bảng trung gian `stg_network_flow` (cho Transformation 1).
* [sql/02_star_schema_ddl.sql](sql/02_star_schema_ddl.sql): Mô hình hình sao 5 bảng Dimension và bảng Fact `fact_network_flow` (cho Transformation 2 & 3).

*(Bạn có thể import các file `.sql` này vào hệ quản trị CSDL đích của bạn như PostgreSQL/MySQL mà Pentaho trỏ tới).*

## 6. CHẠY ETL UNSW-NB15

Khởi động PostgreSQL và database schema:

```bash
docker compose up -d postgres
```

Sau đó chạy Master ETL:

```bash
chmod +x pentaho/run_unsw_etl.sh
./pentaho/run_unsw_etl.sh
```

Script sẽ ưu tiên chạy `jb_master_unsw_dw.kjb` bằng Pentaho Kitchen nếu đã cài PDI. Nếu Pentaho chưa có trong máy, script tự động dùng bước fallback Python + PostgreSQL SQL để hoàn tất cùng pipeline:

1. `tr_staging_load_parquet.ktr` / loader Python: nạp Parquet sạch vào staging.
2. `tr_load_dimensions.ktr` / SQL dimensions: nạp host, protocol, attack, date và time.
3. `tr_load_fact_flow.ktr` / SQL fact: lookup khóa và nạp 2,540,047 dòng fact.

Các transformation và master job Pentaho nằm tại `pentaho/transformations/` và `pentaho/jobs/`.
