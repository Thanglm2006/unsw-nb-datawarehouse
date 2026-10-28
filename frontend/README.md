# UNSW-NB15 Dashboard

React dashboard đọc dữ liệu từ FastAPI.

## Cấu trúc

- `src/pages/`: `DashboardPage`, `ETLPage`.
- `src/api/`: Axios client và API modules theo domain.
- `src/config.js`: API base URL.
- `src/components/`: layout, filters, charts và tables.

HTTP dùng Axios; cache, loading, retry và refetch dùng TanStack Query.

## Chạy

Backend và PostgreSQL:

```bash
docker compose up -d postgres api
```

Frontend:

```bash
cp .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5175`.

## Cấu hình API

Chạy local qua Vite proxy:

```env
VITE_API_BASE_URL=
```

Chạy frontend với backend ở domain khác:

```env
VITE_API_BASE_URL=https://dw-api.caelestial.store
```

## Các page

- Dashboard: KPI, attack distribution, timeline, hourly profile, protocol/service, port profile, duration, top IP và flow search.
- ETL & Data Quality: pipeline status, audit history, row counts, reject rows và quality metrics.
