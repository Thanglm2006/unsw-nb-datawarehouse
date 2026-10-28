# UNSW-NB15 Dashboard

React dashboard đọc dữ liệu từ FastAPI, không đọc JSON tĩnh.

## Chạy

npm install
npm run dev

Vite proxy các request /api tới http://localhost:8000.

Backend và PostgreSQL phải đang chạy:

docker compose up -d postgres api

Nếu chạy FastAPI ngoài Docker:

source ~/venv/bin/activate
uvicorn backend.app:app --reload --port 8000

Dashboard hỗ trợ:

- KPI overview;
- attack distribution;
- traffic theo ngày/giờ;
- protocol/service distribution;
- filter ngày, protocol, attack category;
- flow search và server-side pagination.
