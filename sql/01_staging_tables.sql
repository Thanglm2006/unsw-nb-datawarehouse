-- =============================================================================
-- 01_staging_tables.sql: Định nghĩa bảng Staging lưu trữ dữ liệu luồng mạng thô
-- Đã làm sạch định dạng để chuẩn bị nạp vào Data Warehouse
-- =============================================================================

DROP TABLE IF EXISTS stg_network_flow CASCADE;

CREATE TABLE stg_network_flow (
    -- Khóa nhân tạo tạm thời trong Staging
    stg_id BIGSERIAL PRIMARY KEY,
    
    -- Thuộc tính mạng cơ bản
    srcip VARCHAR(64) NOT NULL,
    sport INTEGER NOT NULL,          -- Đã xử lý Hex -> Dec, non-port = -1
    dstip VARCHAR(64) NOT NULL,
    dsport INTEGER NOT NULL,         -- Đã xử lý Hex -> Dec, non-port = -1
    proto VARCHAR(32) NOT NULL,
    state VARCHAR(32) NOT NULL,
    dur DOUBLE PRECISION,
    sbytes BIGINT,
    dbytes BIGINT,
    sttl INTEGER,
    dttl INTEGER,
    sloss INTEGER,
    dloss INTEGER,
    service VARCHAR(32) NOT NULL,    -- Đã chuẩn hóa '-' -> 'unknown'
    sload DOUBLE PRECISION,
    dload DOUBLE PRECISION,
    spkts INTEGER,
    dpkts INTEGER,
    swin INTEGER,
    dwin INTEGER,
    stcpb BIGINT,
    dtcpb BIGINT,
    smeansz INTEGER,
    dmeansz INTEGER,
    trans_depth INTEGER,
    res_bdy_len BIGINT,
    sjit DOUBLE PRECISION,
    djit DOUBLE PRECISION,
    
    -- Dấu thời gian gốc và chuyển đổi
    stime DOUBLE PRECISION NOT NULL,
    ltime DOUBLE PRECISION NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE,
    last_datetime TIMESTAMP WITH TIME ZONE,
    date_key INTEGER,               -- Khóa ngày YYYYMMDD
    time_key INTEGER,               -- Khóa giờ HHMMSS
    
    -- Đo lường mạng TCP và độ trễ
    sinpkt DOUBLE PRECISION,
    dinpkt DOUBLE PRECISION,
    tcprtt DOUBLE PRECISION,
    synack DOUBLE PRECISION,
    ackdat DOUBLE PRECISION,
    is_sm_ips_ports SMALLINT,
    ct_state_ttl INTEGER,
    ct_flw_http_mthd INTEGER DEFAULT 0, -- Đã impute 0
    is_ftp_login SMALLINT DEFAULT 0,    -- Đã impute 0
    ct_ftp_cmd INTEGER,
    ct_srv_src INTEGER,
    ct_srv_dst INTEGER,
    ct_dst_ltm INTEGER,
    ct_src_ltm INTEGER,
    ct_src_dport_ltm INTEGER,
    ct_dst_sport_ltm INTEGER,
    ct_dst_src_ltm INTEGER,
    
    -- Nhãn phân loại tấn công
    attack_cat VARCHAR(64) NOT NULL,    -- Đã chuẩn hóa 'Backdoors' -> 'Backdoor', rỗng -> 'Normal'
    label SMALLINT NOT NULL             -- 0: Normal, 1: Attack
);

-- Chỉ mục hỗ trợ trích xuất Dimension nhanh chóng
CREATE INDEX idx_stg_proto_service_state ON stg_network_flow (proto, service, state);
CREATE INDEX idx_stg_attack ON stg_network_flow (attack_cat, label);
CREATE INDEX idx_stg_srcip ON stg_network_flow (srcip);
CREATE INDEX idx_stg_dstip ON stg_network_flow (dstip);
CREATE INDEX idx_stg_date_time ON stg_network_flow (date_key, time_key);
