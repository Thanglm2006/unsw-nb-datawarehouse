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

## 3. HƯỚNG DẪN KHỞI TẠO GIT REPOSITORY (GIT REPO SETUP GUIDE)

Dự án đã được cấu hình `.gitignore` chuẩn nhằm tự động loại bỏ các tệp CSV dung lượng lớn (`data/raw/*.csv` ~586 MB) và các tệp cache/tạm thời, đảm bảo Git repository nhẹ và chuẩn CI/CD.

Thực hiện các bước sau trong terminal để khởi tạo kho mã nguồn Git:

### Bước 1: Khởi tạo Git repository nội bộ
```bash
cd /home/thanglm2006/DW
git init
```

### Bước 2: Kiểm tra trạng thái tệp (Đảm bảo CSV lớn đã được ignore)
```bash
git status
```
*Bạn sẽ thấy các thư mục `docs/`, `src/`, `sql/`, `tests/`, `data/metadata/`, `.gitignore` hiển thị màu xanh/đỏ, trong khi các file `.csv` lớn trong `data/raw/` hoàn toàn không xuất hiện.*

### Bước 3: Thêm toàn bộ mã nguồn vào staging và tạo Commit đầu tiên
```bash
git add .
git commit -m "feat: initial commit - DW project structure, preprocessing pipeline, SQL schemas, and ETL docs"
```

### Bước 4: Đổi tên nhánh mặc định thành `main`
```bash
git branch -M main
```

### Bước 5: Kết nối với Git Remote (GitHub / GitLab / Bitbucket)
Tạo một repository mới trên GitHub (hoặc GitLab), sau đó chạy các lệnh sau (thay URL bằng repo của bạn):
```bash
# Thêm địa chỉ remote origin
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Đẩy toàn bộ mã nguồn lên nhánh chính
git push -u origin main
```

---

## 4. HƯỚNG DẪN CHẠY MODULE TIỀN XỬ LÝ (PREPROCESSING EXECUTION)

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

## 5. KHỞI TẠO CƠ SỞ DỮ LIỆU KHO DỮ LIỆU (SQL DDL)

Đăng nhập vào PostgreSQL và chạy tuần tự 2 script:
```bash
psql -U <username> -d <database_name> -f sql/01_staging_tables.sql
psql -U <username> -d <database_name> -f sql/02_star_schema_ddl.sql
```
