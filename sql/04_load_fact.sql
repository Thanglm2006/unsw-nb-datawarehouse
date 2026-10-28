BEGIN;
TRUNCATE TABLE fact_network_flow;

INSERT INTO fact_network_flow (
    date_key, time_key, source_host_key, dest_host_key, proto_service_key, attack_key,
    source_port, dest_port, duration, source_bytes, dest_bytes, source_pkts, dest_pkts,
    source_load, dest_load, source_ttl, dest_ttl, source_loss, dest_loss,
    source_jitter, dest_jitter, tcp_rtt, syn_ack, ack_dat, source_win, dest_win,
    trans_depth, res_bdy_len, ct_srv_src, ct_srv_dst, ct_dst_ltm, ct_src_ltm,
    ct_src_dport_ltm, ct_dst_sport_ltm, ct_dst_src_ltm, is_sm_ips_ports,
    ct_state_ttl, ct_flw_http_mthd, is_ftp_login, ct_ftp_cmd
)
SELECT s.date_key,
       s.time_key,
       source_host.host_key,
       dest_host.host_key,
       protocol.proto_service_key,
       attack.attack_key,
       s.sport,
       s.dsport,
       s.dur,
       s.sbytes,
       s.dbytes,
       s.spkts,
       s.dpkts,
       s.sload,
       s.dload,
       s.sttl,
       s.dttl,
       s.sloss,
       s.dloss,
       s.sjit,
       s.djit,
       s.tcprtt,
       s.synack,
       s.ackdat,
       s.swin,
       s.dwin,
       s.trans_depth,
       s.res_bdy_len,
       s.ct_srv_src,
       s.ct_srv_dst,
       s.ct_dst_ltm,
       s.ct_src_ltm,
       s.ct_src_dport_ltm,
       s.ct_dst_sport_ltm,
       s.ct_dst_src_ltm,
       s.is_sm_ips_ports,
       s.ct_state_ttl,
       s.ct_flw_http_mthd,
       s.is_ftp_login,
       s.ct_ftp_cmd
FROM stg_network_flow s
JOIN dim_host source_host ON source_host.ip_address = s.srcip
JOIN dim_host dest_host ON dest_host.ip_address = s.dstip
JOIN dim_protocol_service protocol
  ON protocol.protocol_name = s.proto
 AND protocol.service_name = s.service
 AND protocol.state_name = s.state
JOIN dim_attack_classification attack
  ON attack.attack_category = s.attack_cat
 AND attack.is_attack_label = s.label;

COMMIT;
