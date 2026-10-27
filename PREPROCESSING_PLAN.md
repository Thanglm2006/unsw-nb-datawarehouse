# KẾ HOẠCH TRIỂN KHAI TIỀN XỬ LÝ DỮ LIỆU (PREPROCESSING IMPLEMENTATION PLAN)

---

## 1. MỤC TIÊU VÀ PHẠM VI

Kế hoạch này quy định chi tiết quy trình xây dựng module tiền xử lý dữ liệu (Preprocessing Pipeline) tự động bằng Python/Pandas/PyArrow nhằm làm sạch toàn bộ **2,540,047 bản ghi** từ 4 tệp dữ liệu thô `UNSW-NB15_*.csv`, chuẩn bị nguồn dữ liệu sạch (Cleaned / Silver Layer) sẵn sàng nạp vào Kho Dữ Liệu (Pentaho / SQL Data Warehouse).

---

## 2. MA TRẬN QUY TẮC LÀM SẠCH DỮ LIỆU (DATA CLEANING MATRIX)

| Trường Dữ Liệu | Hiện Trạng Dữ Liệu Thô | Quy Tắc Chuyển Đổi (Transformation Rule) | Kết Quả Sau Xử Lý | Kiểu Dữ Liệu Đích |
| :--- | :--- | :--- | :--- | :--- |
| **Tên 49 cột** | 4 file CSV thô không có header | Nạp từ `NUSW-NB15_features.csv`, sửa `ct_src_ ltm` $\rightarrow$ `ct_src_ltm` | 49 cột chuẩn tên chuẩn snake_case | String header |
| **Ký tự BOM** | `\xef\xbb\xbf` ở đầu dòng 1 file 1 | Đọc tệp bằng encoding `utf-8-sig` | Loại bỏ hoàn toàn 3 byte BOM | UTF-8 String |
| **`sport` / `dsport`** | Chứa `'0x000b'`, `'-'`, `'0x20205321'` | - Nếu `'-'` hoặc rỗng $\rightarrow$ `-1`<br>- Nếu có tiền tố `0x`/`0X` $\rightarrow$ parse hex sang dec.<br>- Nếu ngoài `[0, 65535]` $\rightarrow$ `-1` | Số nguyên cổng mạng hợp lệ `[0, 65535]` hoặc `-1` | `int32` |
| **`ct_flw_http_mthd`** | Bị trống (blank `, ,`) ở file 2, 3, 4 (53.07% rỗng) | `fillna(0).astype(int)` | Điền `0` cho các kết nối không dùng HTTP | `int32` |
| **`is_ftp_login`** | Bị trống (blank `, ,`) ở file 2, 3, 4 (56.30% rỗng) | `fillna(0).astype(int)` | Điền `0` cho các kết nối không đăng nhập FTP | `int16` |
| **`service`** | 49.07% mang giá trị `'-'` | `replace({'-': 'unknown'}).fillna('unknown').str.strip()` | Giá trị dịch vụ rõ ràng hoặc `'unknown'` | `category / string` |
| **`attack_cat`** | 87.35% là NaN/rỗng khi Normal; có khoảng trắng `' Fuzzers '`; có `'Backdoors'` | `fillna('Normal').str.strip().replace({'Backdoors': 'Backdoor'})` | Tên nhóm chuẩn hóa: Normal, Generic, Exploits, Fuzzers, DoS, Reconnaissance, Analysis, Backdoor, Shellcode, Worms | `category / string` |
| **`Stime` / `Ltime`** | Số thực Unix Epoch giây (VD: `1421927414.0`) | `pd.to_datetime(col, unit='s', utc=True)` | Cột Datetime chuẩn UTC | `datetime64[ns, UTC]` |
| **`date_key`** | Chưa có | Trích xuất `Stime.dt.strftime('%Y%m%d').astype(int)` | Khóa ngày liên kết `Dim_Date` (VD: `20150122`) | `int32` |
| **`time_key`** | Chưa có | Trích xuất `Stime.dt.strftime('%H%M%S').astype(int)` | Khóa giờ liên kết `Dim_Time` (VD: `114937`) | `int32` |
| **Toàn bộ bản ghi** | ~6.7% dòng trùng lặp 100% | Lọc trùng (`drop_duplicates()`) hoặc đánh số `flow_id` tự tăng | Dữ liệu sạch, sẵn sàng phân tích | Khóa Surrogate |

---

## 3. CÁC GIAI ĐOẠN TRIỂN KHAI (IMPLEMENTATION PHASES)

```
[Phase 1: Xây dựng Module Preprocessor Core]
                    │
                    ▼
[Phase 2: Xử lý Chunking & Xuất dữ liệu sạch (Cleaned Parquet/CSV)]
                    │
                    ▼
[Phase 3: Kiểm thử chất lượng (Validation & Assertions)]
                    │
                    ▼
[Phase 4: Tích hợp nạp vào Staging Database]
```

### Giai đoạn 1: Xây dựng Module Preprocessor (`src/preprocessing/cleaner.py`)
* Xây dựng class `UNSWDataCleaner` với các hàm thành phần:
  1. `load_feature_names()`: Đọc và chuẩn hóa 49 tên cột.
  2. `clean_ports(series)`: Vectorized function hoặc regex chuyển đổi Hex/hyphen/overflow port sang `int32`.
  3. `clean_categoricals(df)`: Xử lý khoảng trắng thừa, map `Backdoors` $\rightarrow$ `Backdoor`, điền `'Normal'`, điền `'unknown'` cho `service`.
  4. `impute_missing_counters(df)`: Điền `0` cho các trường HTTP và FTP.
  5. `extract_temporal_keys(df)`: Chuyển đổi timestamp Unix sang Datetime, trích xuất `date_key`, `time_key`.

### Giai đoạn 2: Xử lý theo khối (Chunked Streaming) để tối ưu RAM
* Vì tập dữ liệu có hơn 2.54 triệu dòng, quy trình đọc được chia theo khối (`chunksize = 200,000` dòng).
* Dữ liệu sau khi làm sạch được ghi nối tiếp vào định dạng **Apache Parquet** (`data/processed/unsw_nb15_cleaned.parquet`) hoặc CSV đã làm sạch (`data/processed/stg_unsw_cleaned.csv`).
* Định dạng Parquet giúp:
  * Nén dung lượng từ ~586 MB xuống còn dưới **80 MB**.
  * Lưu trữ chuẩn kiểu dữ liệu (Schema-preserved: int32, float64, datetime, category).

### Giai đoạn 3: Kiểm thử chất lượng dữ liệu (Data Quality Gates)
Xây dựng bộ kiểm tra tự động (`tests/test_preprocessing.py`):
1. **Gate 1 - Zero Nulls on Crucial Keys**: Kiểm tra không có giá trị NULL trong các cột `srcip`, `sport`, `dstip`, `dsport`, `proto`, `state`, `date_key`, `time_key`.
2. **Gate 2 - Port Range Validation**: Kiểm tra toàn bộ `sport` và `dsport` thỏa mãn điều kiện `port == -1` hoặc `(0 <= port <= 65535)`.
3. **Gate 3 - Label & Category Consistency**: Kiểm tra nếu `Label == 0` thì `attack_cat == 'Normal'`; nếu `Label == 1` thì `attack_cat != 'Normal'`.
4. **Gate 4 - Row Count Integrity**: Đảm bảo tổng số dòng sau khi gộp đúng 2,540,047 dòng (hoặc số dòng chính xác sau khi deduplication).

### Giai đoạn 4: Tích hợp với Pentaho / Database Staging
* Script Python có thể chạy độc lập qua CLI:
  ```bash
  python -m src.preprocessing.cleaner --input-dir data/raw --output-file data/processed/unsw_nb15_cleaned.parquet
  ```
* Sau khi tạo file sạch, Pentaho hoặc script SQL nạp trực tiếp vào cơ sở dữ liệu với tốc độ cao mà không lo lỗi định dạng.
