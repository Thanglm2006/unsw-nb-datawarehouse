# UNSW-NB15 Data Warehouse

Project xây dựng kho dữ liệu phân tích lưu lượng mạng UNSW-NB15 theo mô hình Kimball Star Schema.

- Pentaho Data Integration: ETL trung tâm.
- PostgreSQL: staging, dimensions, fact và analytical views.
- FastAPI: REST API đọc dữ liệu.
- React/Vite: dashboard.

## Kiến trúc

```text
4 CSV raw
  -> Pentaho tr_staging_clean_raw.ktr
  -> PostgreSQL staging
  -> Pentaho load dimensions
  -> Pentaho load fact
  -> Materialized views
  -> FastAPI
  -> React dashboard
```

Pentaho đọc và làm sạch CSV trực tiếp. Python preprocessing và Parquet không còn nằm trong pipeline.

## Yêu cầu

- Docker và Docker Compose.
- Pentaho Data Integration, gồm Spoon và Kitchen.
- Java tương thích với phiên bản PDI.
- Node.js LTS và npm cho frontend.
- PostgreSQL JDBC driver nếu bản PDI chưa có sẵn.

Spoon và Kitchen nằm trong cùng một bộ PDI:

- Spoon: thiết kế và kiểm tra file `.ktr`, `.kjb`.
- Kitchen: chạy Master Job bằng command line.

### Arch Linux

`yay` chỉ dùng trên Arch để cài package từ AUR:

```bash
sudo pacman -Syu
sudo pacman -S --needed base-devel git
yay -S pdi-ce
```

Package AUR thường cung cấp hai lệnh:

```bash
spoon
kitchen
```

Kiểm tra:

```bash
java -version
spoon
kitchen -version
```

Nếu dùng bản ZIP của PDI, tên lệnh có thể là `spoon.sh` và `kitchen.sh`. Script project hỗ trợ cả hai dạng.

### Ubuntu CLI

Ubuntu không có AUR và không dùng được `yay`. Cài các dependency bằng `apt`:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin unzip wget git openjdk-17-jre
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker
```

Nếu máy đã có Java 21, có thể thử dùng Java 21 trước. Java 17 là phương án thay thế nếu PDI không khởi động được.

Tải bản PDI Linux ZIP từ trang phân phối Pentaho, sau đó giải nén bằng CLI:

```bash
mkdir -p "$HOME/opt"
PDI_ARCHIVE="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'pdi-ce-*.zip' -print -quit)"
test -n "$PDI_ARCHIVE" || { echo "Không tìm thấy file PDI ZIP trong ~/Downloads" >&2; exit 1; }
unzip "$PDI_ARCHIVE" -d "$HOME/opt"
find "$HOME/opt" -type f \( -name spoon.sh -o -name kitchen.sh \)
```

Nếu thư mục sau giải nén là `data-integration`, thêm vào PATH:

```bash
export PDI_HOME="$HOME/opt/data-integration"
export PATH="$PDI_HOME:$PATH"
chmod +x "$PDI_HOME"/*.sh
echo 'export PDI_HOME="$HOME/opt/data-integration"' >> "$HOME/.bashrc"
echo 'export PATH="$PDI_HOME:$PATH"' >> "$HOME/.bashrc"
source "$HOME/.bashrc"
```

Kiểm tra:

```bash
java -version
spoon.sh
kitchen.sh -version
```

Nếu PDI được cài ở thư mục khác, thay giá trị `PDI_HOME` tương ứng.

## Chuẩn bị dữ liệu

Đặt bốn file raw vào:

```text
data/raw/UNSW-NB15_1.csv
data/raw/UNSW-NB15_2.csv
data/raw/UNSW-NB15_3.csv
data/raw/UNSW-NB15_4.csv
```

Các file CSV không cần commit vào Git.

## Khởi động PostgreSQL và API

Tạo file môi trường local:

```bash
cp .env.example .env
```

Khởi động:

```bash
docker compose up -d postgres api
docker compose ps
```

API chạy tại:

```text
http://localhost:8000
```

Kiểm tra:

```bash
curl http://localhost:8000/health
```

Nếu cổng PostgreSQL `5432` bị chiếm, sửa trong `.env`:

```env
POSTGRES_PORT=5433
```

Khi đó dùng port `5433` trong connection của Spoon. Không dùng `docker compose down -v` nếu muốn giữ dữ liệu PostgreSQL.

## Cấu hình và chạy Pentaho

### 1. Tạo connection trong Spoon

Mở Spoon:

```bash
spoon
```

Mở transformation:

```text
pentaho/transformations/tr_staging_clean_raw.ktr
```

Tạo PostgreSQL connection với:

```text
Connection name: unsw_dw_postgres
Host: localhost
Port: 5432 hoặc giá trị POSTGRES_PORT trong .env
Database: unsw_dw
User: unsw
Password: unsw_password
```

Đặt biến PDI:

```text
RAW_DATA_DIR=/absolute/path/to/DW/data/raw
```

Preview CSV và chạy thử với một file nhỏ trước.

### 2. Chạy toàn bộ ETL

Sau khi connection và field mapping đã được kiểm tra:

```bash
export RAW_DATA_DIR="$PWD/data/raw"
./pentaho/run_unsw_etl.sh
```

Master Job thực hiện:

```text
Check PostgreSQL
  -> Clean/load staging
  -> Load dimensions
  -> Load fact
  -> Refresh analytical views
  -> Validate staging_count = fact_count
```

Có thể chạy trực tiếp:

```bash
kitchen -file="$PWD/pentaho/jobs/jb_master_unsw_dw.kjb" -level=Basic
```

Hoặc với bản ZIP:

```bash
kitchen.sh -file="$PWD/pentaho/jobs/jb_master_unsw_dw.kjb" -level=Basic
```

## Chạy frontend

Nếu API đang chạy bằng Docker:

```bash
cd frontend
npm install
npm run dev
```

Mở:

```text
http://localhost:5173
```

Frontend gọi API qua Vite proxy:

```text
/api/v1/metrics/overview
/api/v1/attacks/distribution
/api/v1/traffic/timeseries
/api/v1/flows/search
```

## Kiểm tra dữ liệu sau ETL

```bash
docker compose exec postgres psql -U unsw -d unsw_dw -c "SELECT count(*) AS staging FROM stg_network_flow; SELECT count(*) AS fact FROM fact_network_flow;"
curl http://localhost:8000/api/v1/metrics/overview
```

Hai số lượng staging và fact phải bằng nhau.

## Khởi tạo lại database

Các file SQL trong `docker-entrypoint-initdb.d` chỉ chạy khi volume mới được tạo. Nếu cần xóa và tạo lại toàn bộ database:

```bash
docker compose down -v
docker compose up -d postgres api
```

Lệnh này xóa dữ liệu PostgreSQL hiện tại.

## Tài liệu chi tiết

- [Pentaho ETL Plan](PENTAHO_ETL_PLAN.md)
- [Raw Data Analysis](RAW_DATA_ANALYSIS.md)
- [Frontend README](frontend/README.md)
- [Backend API](backend/app.py)
