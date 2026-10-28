"""FastAPI read layer for the UNSW-NB15 warehouse."""

import json
import os
from datetime import date
from typing import Any

import asyncpg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://unsw:unsw_password@localhost:5432/unsw_dw",
)
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app = FastAPI(title="UNSW-NB15 Data Warehouse API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"^https://dw\.caelestial\.store$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def open_pool() -> None:
    app.state.pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)


@app.on_event("shutdown")
async def close_pool() -> None:
    await app.state.pool.close()


async def fetch_all(query: str, *args: Any) -> list[dict[str, Any]]:
    async with app.state.pool.acquire() as connection:
        rows = await connection.fetch(query, *args)
    return [dict(row) for row in rows]


async def fetch_one(query: str, *args: Any) -> dict[str, Any]:
    async with app.state.pool.acquire() as connection:
        row = await connection.fetchrow(query, *args)
    if row is None:
        raise HTTPException(status_code=503, detail="Analytical layer is empty")
    return dict(row)


def filter_parts(
    start_date: date | None,
    end_date: date | None,
    protocol: str | None,
    attack_category: str | None,
) -> tuple[str, list[Any]]:
    return (
        " AND ".join(
            [
                "($1::date IS NULL OR d.full_date >= $1)",
                "($2::date IS NULL OR d.full_date <= $2)",
                "($3::text IS NULL OR p.protocol_name = $3)",
                "($4::text IS NULL OR a.attack_category = $4)",
            ]
        ),
        [start_date, end_date, protocol, attack_category],
    )


@app.get("/health")
async def health() -> dict[str, str]:
    await fetch_one("SELECT 1 AS ok")
    return {"status": "ok"}


@app.get("/api/v1/metrics/overview")
async def overview(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> dict[str, Any]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    row = await fetch_one(
        f"""
        SELECT count(*)::bigint AS total_records,
               count(*) FILTER (WHERE a.is_attack_label = 0)::bigint AS normal_count,
               count(*) FILTER (WHERE a.is_attack_label = 1)::bigint AS attack_count,
               count(DISTINCT f.source_host_key)::bigint AS unique_source_ips,
               count(DISTINCT f.dest_host_key)::bigint AS unique_dest_ips,
               count(DISTINCT p.protocol_name)::bigint AS unique_protocols,
               count(DISTINCT p.service_name)::bigint AS unique_services
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        """,
        *args,
    )
    total = row["total_records"] or 0
    normal = row["normal_count"] or 0
    attack = row["attack_count"] or 0
    return {
        **row,
        "attack_percent": round(attack * 100 / total, 2) if total else 0,
        "normal_percent": round(normal * 100 / total, 2) if total else 0,
    }


@app.get("/api/v1/attacks/distribution")
async def attack_distribution(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT a.attack_category AS category, count(*)::bigint AS count
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY a.attack_category
        ORDER BY count DESC, category
        """,
        *args,
    )


@app.get("/api/v1/traffic/timeseries")
async def traffic_timeseries(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT d.full_date AS date, count(*)::bigint AS total,
               count(*) FILTER (WHERE a.is_attack_label = 1)::bigint AS attacks,
               count(*) FILTER (WHERE a.is_attack_label = 0)::bigint AS normal,
               coalesce(sum(f.source_bytes), 0)::bigint AS source_bytes,
               coalesce(sum(f.dest_bytes), 0)::bigint AS dest_bytes
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY d.full_date
        ORDER BY d.full_date
        """,
        *args,
    )


@app.get("/api/v1/traffic/hourly")
async def traffic_hourly(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT t.hour, count(*)::bigint AS total,
               count(*) FILTER (WHERE a.is_attack_label = 1)::bigint AS attacks,
               count(*) FILTER (WHERE a.is_attack_label = 0)::bigint AS normal
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_time t ON t.time_key = f.time_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY t.hour ORDER BY t.hour
        """,
        *args,
    )


@app.get("/api/v1/distributions/protocols")
async def protocol_distribution(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT p.protocol_name AS protocol, count(*)::bigint AS count
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY p.protocol_name ORDER BY count DESC, protocol
        """,
        *args,
    )


@app.get("/api/v1/distributions/services")
async def service_distribution(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT p.service_name AS service, count(*)::bigint AS count
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY p.service_name ORDER BY count DESC, service
        """,
        *args,
    )


@app.get("/api/v1/ips/source")
async def top_source_ips(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT hsrc.ip_address AS ip, count(*)::bigint AS attack_count
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_host hsrc ON hsrc.host_key = f.source_host_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where} AND a.is_attack_label = 1
        GROUP BY hsrc.ip_address ORDER BY attack_count DESC, ip LIMIT 100
        """,
        *args,
    )


@app.get("/api/v1/ips/destination")
async def top_dest_ips(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT hdst.ip_address AS ip, count(*)::bigint AS attack_count
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_host hdst ON hdst.host_key = f.dest_host_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where} AND a.is_attack_label = 1
        GROUP BY hdst.ip_address ORDER BY attack_count DESC, ip LIMIT 100
        """,
        *args,
    )


@app.get("/api/v1/attacks/by-protocol")
async def attack_by_protocol(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> dict[str, Any]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    rows = await fetch_all(
        f"""
        SELECT a.attack_category AS category, p.protocol_name AS protocol, count(*)::bigint AS count
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY a.attack_category, p.protocol_name
        ORDER BY category, count DESC
        """,
        *args,
    )
    protocols = sorted({row["protocol"] for row in rows})
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        grouped.setdefault(row["category"], {"category": row["category"]})[
            row["protocol"]
        ] = row["count"]
    return {"protocols": protocols, "data": list(grouped.values())}


@app.get("/api/v1/filters")
async def filters() -> dict[str, list[str]]:
    protocols = await fetch_all(
        "SELECT DISTINCT protocol_name AS value FROM dim_protocol_service ORDER BY value"
    )
    attacks = await fetch_all(
        "SELECT DISTINCT attack_category AS value FROM dim_attack_classification ORDER BY value"
    )
    return {
        "protocols": [row["value"] for row in protocols],
        "attack_categories": [row["value"] for row in attacks],
    }


@app.get("/api/v1/etl/status")
async def etl_status() -> dict[str, Any]:
    latest = await fetch_all(
        """
        SELECT run_id, started_at, finished_at, status, source_rows,
               staging_rows, fact_rows, rejected_rows, quality, message
        FROM etl_run_audit
        ORDER BY started_at DESC
        LIMIT 1
        """
    )
    latest_run = latest[0] if latest else None
    if latest_run and isinstance(latest_run.get("quality"), str):
        try:
            latest_run["quality"] = json.loads(latest_run["quality"])
        except json.JSONDecodeError:
            pass
    counts = await fetch_one(
        """
        SELECT (SELECT count(*) FROM stg_network_flow) AS staging_rows,
               (SELECT count(*) FROM fact_network_flow) AS fact_rows,
               (SELECT count(*) FROM dim_host) AS hosts,
               (SELECT count(*) FROM dim_protocol_service) AS protocol_services,
               (SELECT count(*) FROM dim_attack_classification) AS attack_categories,
               (SELECT count(*) FROM stg_network_flow_reject) AS rejected_rows
        """
    )
    return {"latest": latest_run, "counts": counts}


@app.get("/api/v1/etl/runs")
async def etl_runs(limit: int = Query(20, ge=1, le=100)) -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT run_id, started_at, finished_at, status, source_rows,
               staging_rows, fact_rows, rejected_rows, quality, message
        FROM etl_run_audit
        ORDER BY started_at DESC
        LIMIT $1
        """,
        limit,
    )
    for row in rows:
        if isinstance(row.get("quality"), str):
            try:
                row["quality"] = json.loads(row["quality"])
            except json.JSONDecodeError:
                pass
    return rows


@app.get("/api/v1/metrics/traffic")
async def traffic_metrics(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> dict[str, Any]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    row = await fetch_one(
        f"""
        SELECT coalesce(sum(f.source_bytes), 0)::bigint AS source_bytes,
               coalesce(sum(f.dest_bytes), 0)::bigint AS dest_bytes,
               coalesce(sum(f.source_pkts), 0)::bigint AS source_packets,
               coalesce(sum(f.dest_pkts), 0)::bigint AS dest_packets,
               coalesce(avg(f.duration), 0)::double precision AS avg_duration,
               coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY f.duration), 0)::double precision AS median_duration,
               coalesce(max(f.duration), 0)::double precision AS max_duration
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        """,
        *args,
    )
    return row


@app.get("/api/v1/metrics/protocol-volume")
async def protocol_volume(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT p.protocol_name AS protocol,
               count(*)::bigint AS flows,
               coalesce(sum(f.source_bytes + f.dest_bytes), 0)::bigint AS bytes,
               coalesce(sum(f.source_pkts + f.dest_pkts), 0)::bigint AS packets,
               coalesce(avg(f.duration), 0)::double precision AS avg_duration
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
        WHERE {where}
        GROUP BY p.protocol_name
        ORDER BY bytes DESC
        """,
        *args,
    )


@app.get("/api/v1/metrics/ports")
async def port_metrics(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        WITH filtered AS (
            SELECT f.source_port, f.dest_port
            FROM fact_network_flow f
            JOIN dim_date d ON d.date_key = f.date_key
            JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
            JOIN dim_attack_classification a ON a.attack_key = f.attack_key
            WHERE {where}
        ), grouped AS (
        SELECT port_range, sum(source_count)::bigint AS source_count,
               sum(dest_count)::bigint AS dest_count
        FROM (
            SELECT CASE
                     WHEN source_port = -1 THEN 'Non-port'
                     WHEN source_port <= 1023 THEN 'Well-known'
                     WHEN source_port <= 49151 THEN 'Registered'
                     ELSE 'Dynamic'
                   END AS port_range,
                   count(*) AS source_count, 0::bigint AS dest_count
            FROM filtered
            GROUP BY 1
            UNION ALL
            SELECT CASE
                     WHEN dest_port = -1 THEN 'Non-port'
                     WHEN dest_port <= 1023 THEN 'Well-known'
                     WHEN dest_port <= 49151 THEN 'Registered'
                     ELSE 'Dynamic'
                   END AS port_range,
                   0::bigint AS source_count, count(*) AS dest_count
            FROM filtered
            GROUP BY 1
        ) grouped
        GROUP BY port_range
        )
        SELECT * FROM grouped
        ORDER BY CASE port_range WHEN 'Non-port' THEN 1 WHEN 'Well-known' THEN 2 WHEN 'Registered' THEN 3 ELSE 4 END
        """,
        *args,
    )


@app.get("/api/v1/metrics/duration-buckets")
async def duration_buckets(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
) -> list[dict[str, Any]]:
    where, args = filter_parts(start_date, end_date, protocol, attack_category)
    return await fetch_all(
        f"""
        SELECT bucket, count(*)::bigint AS flows,
               count(*) FILTER (WHERE is_attack_label = 1)::bigint AS attacks
        FROM (
            SELECT f.duration,
                   CASE
                     WHEN f.duration < 0.01 THEN '0-0.01s'
                     WHEN f.duration < 0.1 THEN '0.01-0.1s'
                     WHEN f.duration < 1 THEN '0.1-1s'
                     WHEN f.duration < 10 THEN '1-10s'
                     WHEN f.duration < 60 THEN '10-60s'
                     ELSE '60s+'
                   END AS bucket,
                   a.is_attack_label
            FROM fact_network_flow f
            JOIN dim_date d ON d.date_key = f.date_key
            JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
            JOIN dim_attack_classification a ON a.attack_key = f.attack_key
            WHERE {where}
        ) bucketed
        GROUP BY bucket
        ORDER BY CASE bucket WHEN '0-0.01s' THEN 1 WHEN '0.01-0.1s' THEN 2 WHEN '0.1-1s' THEN 3 WHEN '1-10s' THEN 4 WHEN '10-60s' THEN 5 ELSE 6 END
        """,
        *args,
    )


@app.get("/api/v1/flows/search")
async def search_flows(
    start_date: date | None = None,
    end_date: date | None = None,
    protocol: str | None = None,
    attack_category: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    where = " AND ".join(
        [
            "($1::date IS NULL OR d.full_date >= $1)",
            "($2::date IS NULL OR d.full_date <= $2)",
            "($3::text IS NULL OR p.protocol_name = $3)",
            "($4::text IS NULL OR a.attack_category = $4)",
            "($5::text IS NULL OR hsrc.ip_address ILIKE '%' || $5 || '%' OR hdst.ip_address ILIKE '%' || $5 || '%' OR p.service_name ILIKE '%' || $5 || '%')",
        ]
    )
    args = [start_date, end_date, protocol, attack_category, q]
    base = """
        FROM fact_network_flow f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_time t ON t.time_key = f.time_key
        JOIN dim_host hsrc ON hsrc.host_key = f.source_host_key
        JOIN dim_host hdst ON hdst.host_key = f.dest_host_key
        JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
        JOIN dim_attack_classification a ON a.attack_key = f.attack_key
    """
    total = await fetch_one(f"SELECT count(*)::bigint AS total {base} WHERE {where}", *args)
    rows = await fetch_all(
        f"""
        SELECT d.full_date AS date, t.time_key, hsrc.ip_address AS srcip,
               f.source_port AS sport, hdst.ip_address AS dstip,
               f.dest_port AS dsport, p.protocol_name AS proto,
               p.service_name AS service, f.duration AS dur,
               f.source_bytes AS sbytes, f.dest_bytes AS dbytes,
               a.attack_category AS attack_cat,
               a.is_attack_label AS label
        {base}
        WHERE {where}
        ORDER BY d.full_date DESC, t.time_key DESC, f.flow_key DESC
        LIMIT $6 OFFSET $7
        """,
        *args,
        limit,
        offset,
    )
    return {"items": rows, "total": total["total"], "limit": limit, "offset": offset}
