CREATE OR REPLACE VIEW cleaned_flows AS
WITH typed AS (
    SELECT
        nullif(trim(srcip), '') AS srcip,
        trim(sport) AS raw_sport,
        nullif(trim(dstip), '') AS dstip,
        trim(dsport) AS raw_dsport,
        nullif(trim(proto), '') AS proto,
        nullif(trim(state), '') AS state,
        try_cast(nullif(trim(dur), '') AS DOUBLE) AS dur,
        try_cast(nullif(trim(sbytes), '') AS BIGINT) AS sbytes,
        try_cast(nullif(trim(dbytes), '') AS BIGINT) AS dbytes,
        try_cast(nullif(trim(sttl), '') AS INTEGER) AS sttl,
        try_cast(nullif(trim(dttl), '') AS INTEGER) AS dttl,
        try_cast(nullif(trim(sloss), '') AS INTEGER) AS sloss,
        try_cast(nullif(trim(dloss), '') AS INTEGER) AS dloss,
        nullif(trim(service), '') AS raw_service,
        try_cast(nullif(trim(sload), '') AS DOUBLE) AS sload,
        try_cast(nullif(trim(dload), '') AS DOUBLE) AS dload,
        try_cast(nullif(trim(spkts), '') AS INTEGER) AS spkts,
        try_cast(nullif(trim(dpkts), '') AS INTEGER) AS dpkts,
        try_cast(nullif(trim(swin), '') AS INTEGER) AS swin,
        try_cast(nullif(trim(dwin), '') AS INTEGER) AS dwin,
        try_cast(nullif(trim(stcpb), '') AS BIGINT) AS stcpb,
        try_cast(nullif(trim(dtcpb), '') AS BIGINT) AS dtcpb,
        try_cast(nullif(trim(smeansz), '') AS INTEGER) AS smeansz,
        try_cast(nullif(trim(dmeansz), '') AS INTEGER) AS dmeansz,
        try_cast(nullif(trim(trans_depth), '') AS INTEGER) AS trans_depth,
        try_cast(nullif(trim(res_bdy_len), '') AS BIGINT) AS res_bdy_len,
        try_cast(nullif(trim(sjit), '') AS DOUBLE) AS sjit,
        try_cast(nullif(trim(djit), '') AS DOUBLE) AS djit,
        try_cast(nullif(trim(stime), '') AS DOUBLE) AS stime,
        try_cast(nullif(trim(ltime), '') AS DOUBLE) AS ltime,
        try_cast(nullif(trim(sinpkt), '') AS DOUBLE) AS sinpkt,
        try_cast(nullif(trim(dinpkt), '') AS DOUBLE) AS dinpkt,
        try_cast(nullif(trim(tcprtt), '') AS DOUBLE) AS tcprtt,
        try_cast(nullif(trim(synack), '') AS DOUBLE) AS synack,
        try_cast(nullif(trim(ackdat), '') AS DOUBLE) AS ackdat,
        coalesce(try_cast(nullif(trim(is_sm_ips_ports), '') AS SMALLINT), 0) AS is_sm_ips_ports,
        try_cast(nullif(trim(ct_state_ttl), '') AS INTEGER) AS ct_state_ttl,
        coalesce(try_cast(nullif(trim(ct_flw_http_mthd), '') AS INTEGER), 0) AS ct_flw_http_mthd,
        coalesce(try_cast(nullif(trim(is_ftp_login), '') AS SMALLINT), 0) AS is_ftp_login,
        coalesce(try_cast(nullif(trim(ct_ftp_cmd), '') AS INTEGER), 0) AS ct_ftp_cmd,
        try_cast(nullif(trim(ct_srv_src), '') AS INTEGER) AS ct_srv_src,
        try_cast(nullif(trim(ct_srv_dst), '') AS INTEGER) AS ct_srv_dst,
        try_cast(nullif(trim(ct_dst_ltm), '') AS INTEGER) AS ct_dst_ltm,
        try_cast(nullif(trim(ct_src_ltm), '') AS INTEGER) AS ct_src_ltm,
        try_cast(nullif(trim(ct_src_dport_ltm), '') AS INTEGER) AS ct_src_dport_ltm,
        try_cast(nullif(trim(ct_dst_sport_ltm), '') AS INTEGER) AS ct_dst_sport_ltm,
        try_cast(nullif(trim(ct_dst_src_ltm), '') AS INTEGER) AS ct_dst_src_ltm,
        nullif(trim(attack_cat), '') AS raw_attack_cat,
        try_cast(nullif(trim(label), '') AS SMALLINT) AS label
    FROM raw_flows
), normalized AS (
    SELECT
        srcip,
        CASE
            WHEN raw_sport IS NULL OR raw_sport IN ('', '-') THEN -1
            WHEN try_cast(raw_sport AS BIGINT) BETWEEN 0 AND 65535 THEN try_cast(raw_sport AS INTEGER)
            ELSE -1
        END AS sport,
        dstip,
        CASE
            WHEN raw_dsport IS NULL OR raw_dsport IN ('', '-') THEN -1
            WHEN try_cast(raw_dsport AS BIGINT) BETWEEN 0 AND 65535 THEN try_cast(raw_dsport AS INTEGER)
            ELSE -1
        END AS dsport,
        proto, state, dur, sbytes, dbytes, sttl, dttl, sloss, dloss,
        CASE WHEN raw_service IS NULL OR raw_service = '-' THEN 'unknown' ELSE raw_service END AS service,
        sload, dload, spkts, dpkts, swin, dwin, stcpb, dtcpb, smeansz, dmeansz,
        trans_depth, res_bdy_len, sjit, djit, stime, ltime,
        to_timestamp(stime) AS start_datetime,
        to_timestamp(ltime) AS last_datetime,
        sinpkt, dinpkt, tcprtt, synack, ackdat, is_sm_ips_ports, ct_state_ttl,
        ct_flw_http_mthd, is_ftp_login, ct_ftp_cmd, ct_srv_src, ct_srv_dst,
        ct_dst_ltm, ct_src_ltm, ct_src_dport_ltm, ct_dst_sport_ltm, ct_dst_src_ltm,
        CASE
            WHEN label = 0 THEN 'Normal'
            WHEN raw_attack_cat IS NULL OR raw_attack_cat = '' THEN 'Normal'
            WHEN raw_attack_cat = 'Backdoors' THEN 'Backdoor'
            ELSE raw_attack_cat
        END AS attack_cat,
        label
    FROM typed
)
SELECT *,
       CAST(strftime(start_datetime, '%Y%m%d') AS INTEGER) AS date_key,
       CAST(strftime(start_datetime, '%H%M%S') AS INTEGER) AS time_key
FROM normalized;
