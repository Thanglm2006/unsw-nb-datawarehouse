-- =============================================================================
-- 02_star_schema_ddl.sql: Định nghĩa cấu trúc Mô Hình Chiều (Kimball Star Schema)
-- Gồm 5 bảng Dimension và 1 bảng Fact có phân vùng theo ngày (Range Partitioning)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG CHIỀU NGÀY (DIM_DATE)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_date CASCADE;
CREATE TABLE dim_date (
    date_key INTEGER PRIMARY KEY,           -- Định dạng YYYYMMDD (VD: 20150122)
    full_date DATE NOT NULL,
    year SMALLINT NOT NULL,
    quarter SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    month_name VARCHAR(16) NOT NULL,
    day SMALLINT NOT NULL,
    day_of_week SMALLINT NOT NULL,          -- 1: Monday, 7: Sunday
    day_name VARCHAR(16) NOT NULL,
    is_weekend BOOLEAN NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG CHIỀU GIỜ (DIM_TIME)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_time CASCADE;
CREATE TABLE dim_time (
    time_key INTEGER PRIMARY KEY,           -- Định dạng HHMMSS (VD: 114937)
    hour SMALLINT NOT NULL,
    minute SMALLINT NOT NULL,
    second SMALLINT NOT NULL,
    time_of_day_bucket VARCHAR(32) NOT NULL, -- Morning, Afternoon, Evening, Night
    is_business_hours BOOLEAN NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. BẢNG CHIỀU ĐIỂM ĐẦU CUỐI MẠNG / MÁY CHỦ (DIM_HOST)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_host CASCADE;
CREATE TABLE dim_host (
    host_key SERIAL PRIMARY KEY,
    ip_address VARCHAR(64) UNIQUE NOT NULL,
    subnet_prefix VARCHAR(32),
    is_internal_network BOOLEAN DEFAULT TRUE,
    ip_class VARCHAR(8)
);

-- -----------------------------------------------------------------------------
-- 4. BẢNG CHIỀU GIAO THỨC & DỊCH VỤ (DIM_PROTOCOL_SERVICE)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_protocol_service CASCADE;
CREATE TABLE dim_protocol_service (
    proto_service_key SERIAL PRIMARY KEY,
    protocol_name VARCHAR(32) NOT NULL,
    service_name VARCHAR(32) NOT NULL,
    state_name VARCHAR(32) NOT NULL,
    transport_layer VARCHAR(16) DEFAULT 'Layer 4',
    UNIQUE (protocol_name, service_name, state_name)
);

-- -----------------------------------------------------------------------------
-- 5. BẢNG CHIỀU PHÂN LOẠI TẤN CÔNG (DIM_ATTACK_CLASSIFICATION)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_attack_classification CASCADE;
CREATE TABLE dim_attack_classification (
    attack_key SERIAL PRIMARY KEY,
    attack_category VARCHAR(64) NOT NULL,
    is_attack_label SMALLINT NOT NULL,      -- 0: Normal, 1: Attack
    threat_severity VARCHAR(16) DEFAULT 'Medium',
    UNIQUE (attack_category, is_attack_label)
);

-- -----------------------------------------------------------------------------
-- 6. BẢNG SỰ KIỆN LUỒNG MẠNG (FACT_NETWORK_FLOW - Phân vùng theo ngày)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS fact_network_flow CASCADE;
CREATE TABLE fact_network_flow (
    flow_key BIGSERIAL,
    
    -- Khóa ngoại tham chiếu các Dimension
    date_key INTEGER NOT NULL,
    time_key INTEGER NOT NULL,
    source_host_key INTEGER NOT NULL,
    dest_host_key INTEGER NOT NULL,
    proto_service_key INTEGER NOT NULL,
    attack_key INTEGER NOT NULL,
    
    -- Cổng mạng chi tiết
    source_port INTEGER NOT NULL,
    dest_port INTEGER NOT NULL,
    
    -- Đại lượng đo lường (Measures)
    duration DOUBLE PRECISION,
    source_bytes BIGINT,
    dest_bytes BIGINT,
    source_pkts INTEGER,
    dest_pkts INTEGER,
    source_load DOUBLE PRECISION,
    dest_load DOUBLE PRECISION,
    source_ttl INTEGER,
    dest_ttl INTEGER,
    source_loss INTEGER,
    dest_loss INTEGER,
    source_jitter DOUBLE PRECISION,
    dest_jitter DOUBLE PRECISION,
    tcp_rtt DOUBLE PRECISION,
    syn_ack DOUBLE PRECISION,
    ack_dat DOUBLE PRECISION,
    source_win INTEGER,
    dest_win INTEGER,
    trans_depth INTEGER,
    res_bdy_len BIGINT,
    
    -- Chỉ số profile kết nối
    ct_srv_src INTEGER,
    ct_srv_dst INTEGER,
    ct_dst_ltm INTEGER,
    ct_src_ltm INTEGER,
    ct_src_dport_ltm INTEGER,
    ct_dst_sport_ltm INTEGER,
    ct_dst_src_ltm INTEGER,
    is_sm_ips_ports SMALLINT,
    ct_state_ttl INTEGER,
    ct_flw_http_mthd INTEGER,
    is_ftp_login SMALLINT,
    ct_ftp_cmd INTEGER,
    
    PRIMARY KEY (flow_key, date_key)
) PARTITION BY RANGE (date_key);

ALTER TABLE fact_network_flow
    ADD CONSTRAINT fk_fact_date
        FOREIGN KEY (date_key) REFERENCES dim_date(date_key),
    ADD CONSTRAINT fk_fact_time
        FOREIGN KEY (time_key) REFERENCES dim_time(time_key),
    ADD CONSTRAINT fk_fact_source_host
        FOREIGN KEY (source_host_key) REFERENCES dim_host(host_key),
    ADD CONSTRAINT fk_fact_dest_host
        FOREIGN KEY (dest_host_key) REFERENCES dim_host(host_key),
    ADD CONSTRAINT fk_fact_protocol
        FOREIGN KEY (proto_service_key)
        REFERENCES dim_protocol_service(proto_service_key),
    ADD CONSTRAINT fk_fact_attack
        FOREIGN KEY (attack_key) REFERENCES dim_attack_classification(attack_key);

-- Phân vùng cho Đợt 1 (Tháng 1/2015)
CREATE TABLE fact_network_flow_201501 PARTITION OF fact_network_flow
    FOR VALUES FROM (20150101) TO (20150201);

-- Phân vùng cho Đợt 2 (Tháng 2/2015)
CREATE TABLE fact_network_flow_201502 PARTITION OF fact_network_flow
    FOR VALUES FROM (20150201) TO (20150301);

-- Phân vùng mặc định cho các ngày khác
CREATE TABLE fact_network_flow_default PARTITION OF fact_network_flow DEFAULT;

-- Chỉ mục tối ưu truy vấn OLAP & BI
CREATE INDEX idx_fact_date ON fact_network_flow (date_key);
CREATE INDEX idx_fact_time ON fact_network_flow (time_key);
CREATE INDEX idx_fact_hosts ON fact_network_flow (source_host_key, dest_host_key);
CREATE INDEX idx_fact_proto ON fact_network_flow (proto_service_key);
CREATE INDEX idx_fact_attack ON fact_network_flow (attack_key);
