# Pentaho ETL Plan

## Mục tiêu

Pentaho Data Integration là trung tâm của pipeline. Raw CSV được đọc, làm sạch và nạp vào PostgreSQL bằng các transformation PDI. Python không được gọi bởi Master Job.

## Luồng chạy

```text
START
  -> Check PostgreSQL
  -> tr_staging_clean_raw.ktr
  -> tr_load_dimensions.ktr
  -> tr_load_fact_flow.ktr
  -> tr_refresh_analytics.ktr
  -> SUCCESS
```

## Các file

- `jb_master_unsw_dw.kjb`: điều phối toàn bộ pipeline.
- `tr_check_connection.ktr`: kiểm tra PostgreSQL trước khi chạy.
- `tr_staging_clean_raw.ktr`: CSV raw -> `stg_network_flow`.
- `tr_load_dimensions.ktr`: tạo surrogate keys cho dimensions.
- `tr_load_fact_flow.ktr`: lookup keys và nạp fact.
- `tr_refresh_analytics.ktr`: refresh materialized views và kiểm tra số dòng.

## Xử lý staging bằng Pentaho

### CSV File Input

- Đọc `UNSW-NB15_1.csv` đến `UNSW-NB15_4.csv`.
- Header row: tắt.
- Delimiter: dấu phẩy.
- Enclosure: dấu ngoặc kép.
- Encoding: UTF-8 hoặc UTF-8-BOM.
- Khai báo đúng 49 field theo `data/metadata/NUSW-NB15_features.csv`.
- Đọc raw fields dưới dạng String để port Hex và blank không làm parser dừng.

### Modified JavaScript Value

Transformation hiện thực hiện:

- Trim `srcip`, `dstip`, `proto`, `state`, `service`, `attack_cat`.
- Chuyển `sport`, `dsport` từ Hex hoặc decimal.
- Giá trị `-`, rỗng hoặc vượt 65535 thành `-1`.
- Blank counters thành `0`.
- `service = '-'` thành `unknown`.
- `attack_cat = NULL` hoặc `Label = 0` thành `Normal`.
- `Backdoors` thành `Backdoor`.
- Epoch `Stime/Ltime` thành datetime UTC.
- Sinh `date_key = YYYYMMDD` và `time_key = HHMMSS`.

### Table Output

- Target: `stg_network_flow`.
- Batch commit: 10.000.
- Truncate staging được thực hiện trước khi transformation chạy.
- Lỗi output phải được nối tới `stg_network_flow_reject`.

## Load dimensions

`tr_load_dimensions.ktr` chạy SQL:

1. Xóa dimensions của lần full reload.
2. Nạp host duy nhất từ source/destination IP.
3. Nạp tổ hợp protocol/service/state.
4. Nạp attack category/label.
5. Nạp date dimension từ 2010 đến 2030.
6. Nạp time dimension theo từng giây.

## Load fact

`tr_load_fact_flow.ktr`:

- Truncate fact.
- Lookup host keys.
- Lookup protocol/service/state key.
- Lookup attack key.
- Ghi measures vào fact partitioned table.
- Không dùng lookup thất bại để âm thầm bỏ dòng.

Sau khi load, `tr_refresh_analytics.ktr` kiểm tra:

```sql
SELECT count(*) FROM stg_network_flow;
SELECT count(*) FROM fact_network_flow;
```

Pipeline thất bại nếu hai số lượng khác nhau.

## Chạy bằng Spoon

Spoon và Kitchen là hai chương trình trong cùng một bộ PDI, không phải hai bộ cài độc lập. Chỉ cần tải/cài một bộ Pentaho Data Integration.

Spoon dùng để thiết kế và kiểm tra lần đầu:

1. Mở `tr_staging_clean_raw.ktr`.
2. Tạo PostgreSQL connection.
3. Đặt biến `RAW_DATA_DIR`.
4. Preview CSV.
5. Chạy thử một file hoặc một sample.
6. Kiểm tra output staging.
7. Mở Master Job và chạy toàn bộ.

## Chạy tự động bằng Kitchen

Sau khi Spoon đã xác nhận connection và field mapping:

```bash
./pentaho/run_unsw_etl.sh
```

Hoặc:

```bash
kitchen -file=/absolute/path/to/DW/pentaho/jobs/jb_master_unsw_dw.kjb -level=Basic
```

Không cần mở Spoon khi chạy production hoặc chạy lại pipeline.

## Phần cần người vận hành kiểm tra

Repo không thể tự xác nhận PDI runtime nếu máy chưa có `spoon.sh`/`kitchen.sh`. Người vận hành cần:

- cài PDI và JDBC driver;
- xác nhận Java tương thích;
- kiểm tra connection trong Spoon;
- kiểm tra đường dẫn raw files;
- chạy sample trước;
- chạy full 2.54M rows;
- xác nhận số dòng reject và thời gian chạy.
