-- Analytical layer. Pentaho refreshes these views after loading the fact table.

DROP MATERIALIZED VIEW IF EXISTS mv_overview CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_attack_distribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_traffic_timeseries CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_traffic_hourly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_protocol_distribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_service_distribution CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_top_source_ips CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_top_dest_ips CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_attack_by_protocol CASCADE;

CREATE MATERIALIZED VIEW mv_overview AS
SELECT count(*)::bigint AS total_records,
       count(*) FILTER (WHERE a.is_attack_label = 0)::bigint AS normal_count,
       count(*) FILTER (WHERE a.is_attack_label = 1)::bigint AS attack_count,
       count(DISTINCT f.source_host_key)::bigint AS unique_source_ips,
       count(DISTINCT f.dest_host_key)::bigint AS unique_dest_ips,
       count(DISTINCT p.protocol_name)::bigint AS unique_protocols,
       count(DISTINCT p.service_name)::bigint AS unique_services,
       min(d.full_date) AS min_date,
       max(d.full_date) AS max_date
FROM fact_network_flow f
JOIN dim_date d ON d.date_key = f.date_key
JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
JOIN dim_attack_classification a ON a.attack_key = f.attack_key;

CREATE MATERIALIZED VIEW mv_attack_distribution AS
SELECT a.attack_category AS category,
       count(*)::bigint AS count
FROM fact_network_flow f
JOIN dim_attack_classification a ON a.attack_key = f.attack_key
GROUP BY a.attack_category
ORDER BY count DESC, category;

CREATE MATERIALIZED VIEW mv_traffic_timeseries AS
SELECT d.full_date AS date,
       count(*)::bigint AS total,
       count(*) FILTER (WHERE a.is_attack_label = 1)::bigint AS attacks,
       count(*) FILTER (WHERE a.is_attack_label = 0)::bigint AS normal,
       coalesce(sum(f.source_bytes), 0)::bigint AS source_bytes,
       coalesce(sum(f.dest_bytes), 0)::bigint AS dest_bytes
FROM fact_network_flow f
JOIN dim_date d ON d.date_key = f.date_key
JOIN dim_attack_classification a ON a.attack_key = f.attack_key
GROUP BY d.full_date
ORDER BY d.full_date;

CREATE MATERIALIZED VIEW mv_traffic_hourly AS
SELECT t.hour,
       count(*)::bigint AS total,
       count(*) FILTER (WHERE a.is_attack_label = 1)::bigint AS attacks,
       count(*) FILTER (WHERE a.is_attack_label = 0)::bigint AS normal
FROM fact_network_flow f
JOIN dim_time t ON t.time_key = f.time_key
JOIN dim_attack_classification a ON a.attack_key = f.attack_key
GROUP BY t.hour
ORDER BY t.hour;

CREATE MATERIALIZED VIEW mv_protocol_distribution AS
SELECT p.protocol_name AS protocol, count(*)::bigint AS count
FROM fact_network_flow f
JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
GROUP BY p.protocol_name
ORDER BY count DESC, protocol;

CREATE MATERIALIZED VIEW mv_service_distribution AS
SELECT p.service_name AS service, count(*)::bigint AS count
FROM fact_network_flow f
JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
GROUP BY p.service_name
ORDER BY count DESC, service;

CREATE MATERIALIZED VIEW mv_top_source_ips AS
SELECT h.ip_address AS ip, count(*)::bigint AS attack_count
FROM fact_network_flow f
JOIN dim_host h ON h.host_key = f.source_host_key
JOIN dim_attack_classification a ON a.attack_key = f.attack_key
WHERE a.is_attack_label = 1
GROUP BY h.ip_address
ORDER BY attack_count DESC, ip
LIMIT 100;

CREATE MATERIALIZED VIEW mv_top_dest_ips AS
SELECT h.ip_address AS ip, count(*)::bigint AS attack_count
FROM fact_network_flow f
JOIN dim_host h ON h.host_key = f.dest_host_key
JOIN dim_attack_classification a ON a.attack_key = f.attack_key
WHERE a.is_attack_label = 1
GROUP BY h.ip_address
ORDER BY attack_count DESC, ip
LIMIT 100;

CREATE MATERIALIZED VIEW mv_attack_by_protocol AS
SELECT a.attack_category AS category,
       p.protocol_name AS protocol,
       count(*)::bigint AS count
FROM fact_network_flow f
JOIN dim_attack_classification a ON a.attack_key = f.attack_key
JOIN dim_protocol_service p ON p.proto_service_key = f.proto_service_key
GROUP BY a.attack_category, p.protocol_name
ORDER BY a.attack_category, count DESC;

CREATE UNIQUE INDEX idx_mv_overview ON mv_overview ((1));
CREATE UNIQUE INDEX idx_mv_attack_distribution
    ON mv_attack_distribution (category);
CREATE UNIQUE INDEX idx_mv_traffic_timeseries
    ON mv_traffic_timeseries (date);
CREATE UNIQUE INDEX idx_mv_traffic_hourly
    ON mv_traffic_hourly (hour);
CREATE UNIQUE INDEX idx_mv_protocol_distribution
    ON mv_protocol_distribution (protocol);
CREATE UNIQUE INDEX idx_mv_service_distribution
    ON mv_service_distribution (service);
