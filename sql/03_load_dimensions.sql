BEGIN;

TRUNCATE TABLE dim_host, dim_protocol_service, dim_attack_classification,
    dim_date, dim_time RESTART IDENTITY CASCADE;

INSERT INTO dim_host (ip_address, subnet_prefix, is_internal_network, ip_class)
SELECT ip_address,
       split_part(ip_address, '.', 1) || '.' || split_part(ip_address, '.', 2) AS subnet_prefix,
       ip_address LIKE '59.166%' OR ip_address LIKE '149.171%' AS is_internal_network,
       CASE
           WHEN split_part(ip_address, '.', 1)::integer BETWEEN 1 AND 126 THEN 'A'
           WHEN split_part(ip_address, '.', 1)::integer BETWEEN 128 AND 191 THEN 'B'
           ELSE 'Other'
       END AS ip_class
FROM (
    SELECT srcip AS ip_address FROM stg_network_flow
    UNION
    SELECT dstip AS ip_address FROM stg_network_flow
) hosts
WHERE ip_address IS NOT NULL
ORDER BY ip_address;

INSERT INTO dim_protocol_service (protocol_name, service_name, state_name)
SELECT DISTINCT proto, service, state
FROM stg_network_flow
ORDER BY proto, service, state;

INSERT INTO dim_attack_classification
    (attack_category, is_attack_label, threat_severity)
SELECT categories.attack_category,
       categories.is_attack_label,
       CASE categories.is_attack_label WHEN 0 THEN 'None' ELSE 'Medium' END
FROM (
    SELECT DISTINCT attack_cat AS attack_category, label AS is_attack_label
    FROM stg_network_flow
) categories
ORDER BY categories.is_attack_label, categories.attack_category;

INSERT INTO dim_date
    (date_key, full_date, year, quarter, month, month_name, day,
     day_of_week, day_name, is_weekend)
SELECT to_char(d, 'YYYYMMDD')::integer,
       d::date,
       extract(year FROM d)::smallint,
       extract(quarter FROM d)::smallint,
       extract(month FROM d)::smallint,
       to_char(d, 'FMMonth'),
       extract(day FROM d)::smallint,
       extract(isodow FROM d)::smallint,
       to_char(d, 'FMDay'),
       extract(isodow FROM d) IN (6, 7)
FROM generate_series('2010-01-01'::date, '2030-12-31'::date, '1 day') d;

INSERT INTO dim_time
    (time_key, hour, minute, second, time_of_day_bucket, is_business_hours)
SELECT hour * 10000 + minute * 100 + second,
       hour,
       minute,
       second,
       CASE
           WHEN hour < 6 THEN 'Night'
           WHEN hour < 12 THEN 'Morning'
           WHEN hour < 18 THEN 'Afternoon'
           ELSE 'Evening'
       END,
       hour BETWEEN 9 AND 17
FROM generate_series(0, 23) AS hours(hour),
     generate_series(0, 59) AS minutes(minute),
     generate_series(0, 59) AS seconds(second);

COMMIT;
