FROM python:3.12-slim

WORKDIR /app
COPY etl/requirements.txt /app/etl/requirements.txt
RUN pip install --no-cache-dir -r /app/etl/requirements.txt
COPY etl /app/etl
COPY sql /app/sql

CMD ["python", "-m", "etl.run_etl", "--raw-dir", "/data/raw"]
