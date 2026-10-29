import { useMemo } from 'react'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const dimensions = {
  dim_date: {
    title: 'dim_date',
    subtitle: 'Calendar dimension',
    tone: 'cyan',
    fields: [
      ['date_key', 'INTEGER', 'PK'], ['full_date', 'DATE', 'attribute'], ['year', 'SMALLINT', 'attribute'],
      ['quarter', 'SMALLINT', 'attribute'], ['month', 'SMALLINT', 'attribute'], ['month_name', 'VARCHAR(16)', 'attribute'],
      ['day', 'SMALLINT', 'attribute'], ['day_of_week', 'SMALLINT', 'attribute'], ['day_name', 'VARCHAR(16)', 'attribute'],
      ['is_weekend', 'BOOLEAN', 'attribute'],
    ],
  },
  dim_time: {
    title: 'dim_time', subtitle: 'Time-of-day dimension', tone: 'violet',
    fields: [
      ['time_key', 'INTEGER', 'PK'], ['hour', 'SMALLINT', 'attribute'], ['minute', 'SMALLINT', 'attribute'],
      ['second', 'SMALLINT', 'attribute'], ['time_of_day_bucket', 'VARCHAR(32)', 'attribute'], ['is_business_hours', 'BOOLEAN', 'attribute'],
    ],
  },
  dim_host: {
    title: 'dim_host', subtitle: 'Source and destination IP dimension', tone: 'teal',
    fields: [
      ['host_key', 'SERIAL', 'PK'], ['ip_address', 'VARCHAR(64)', 'attribute'], ['subnet_prefix', 'VARCHAR(32)', 'attribute'],
      ['is_internal_network', 'BOOLEAN', 'attribute'], ['ip_class', 'VARCHAR(8)', 'attribute'],
    ],
  },
  dim_protocol_service: {
    title: 'dim_protocol_service', subtitle: 'Protocol context dimension', tone: 'amber',
    fields: [
      ['proto_service_key', 'SERIAL', 'PK'], ['protocol_name', 'VARCHAR(32)', 'attribute'], ['service_name', 'VARCHAR(32)', 'attribute'],
      ['state_name', 'VARCHAR(32)', 'attribute'], ['transport_layer', 'VARCHAR(16)', 'attribute'],
    ],
  },
  dim_attack_classification: {
    title: 'dim_attack_classification', subtitle: 'Security label dimension', tone: 'rose',
    fields: [
      ['attack_key', 'SERIAL', 'PK'], ['attack_category', 'VARCHAR(64)', 'attribute'], ['is_attack_label', 'SMALLINT', 'attribute'],
      ['threat_severity', 'VARCHAR(16)', 'attribute'],
    ],
  },
}

const stagingFields = [
  ['stg_id', 'BIGSERIAL', 'PK'], ['srcip', 'VARCHAR(64)', 'attribute'], ['sport', 'INTEGER', 'attribute'], ['dstip', 'VARCHAR(64)', 'attribute'], ['dsport', 'INTEGER', 'attribute'], ['proto', 'VARCHAR(32)', 'attribute'], ['state', 'VARCHAR(32)', 'attribute'], ['dur', 'DOUBLE PRECISION', 'measure'], ['sbytes', 'BIGINT', 'measure'], ['dbytes', 'BIGINT', 'measure'], ['sttl', 'INTEGER', 'measure'], ['dttl', 'INTEGER', 'measure'], ['sloss', 'INTEGER', 'measure'], ['dloss', 'INTEGER', 'measure'], ['service', 'VARCHAR(32)', 'attribute'], ['sload', 'DOUBLE PRECISION', 'measure'], ['dload', 'DOUBLE PRECISION', 'measure'], ['spkts', 'INTEGER', 'measure'], ['dpkts', 'INTEGER', 'measure'], ['swin', 'INTEGER', 'measure'], ['dwin', 'INTEGER', 'measure'], ['stcpb', 'BIGINT', 'measure'], ['dtcpb', 'BIGINT', 'measure'], ['smeansz', 'INTEGER', 'measure'], ['dmeansz', 'INTEGER', 'measure'], ['trans_depth', 'INTEGER', 'measure'], ['res_bdy_len', 'BIGINT', 'measure'], ['sjit', 'DOUBLE PRECISION', 'measure'], ['djit', 'DOUBLE PRECISION', 'measure'], ['stime', 'DOUBLE PRECISION', 'attribute'], ['ltime', 'DOUBLE PRECISION', 'attribute'], ['start_datetime', 'TIMESTAMPTZ', 'attribute'], ['last_datetime', 'TIMESTAMPTZ', 'attribute'], ['date_key', 'INTEGER', 'FK'], ['time_key', 'INTEGER', 'FK'], ['sinpkt', 'DOUBLE PRECISION', 'measure'], ['dinpkt', 'DOUBLE PRECISION', 'measure'], ['tcprtt', 'DOUBLE PRECISION', 'measure'], ['synack', 'DOUBLE PRECISION', 'measure'], ['ackdat', 'DOUBLE PRECISION', 'measure'], ['is_sm_ips_ports', 'SMALLINT', 'measure'], ['ct_state_ttl', 'INTEGER', 'measure'], ['ct_flw_http_mthd', 'INTEGER', 'measure'], ['is_ftp_login', 'SMALLINT', 'measure'], ['ct_ftp_cmd', 'INTEGER', 'measure'], ['ct_srv_src', 'INTEGER', 'measure'], ['ct_srv_dst', 'INTEGER', 'measure'], ['ct_dst_ltm', 'INTEGER', 'measure'], ['ct_src_ltm', 'INTEGER', 'measure'], ['ct_src_dport_ltm', 'INTEGER', 'measure'], ['ct_dst_sport_ltm', 'INTEGER', 'measure'], ['ct_dst_src_ltm', 'INTEGER', 'measure'], ['attack_cat', 'VARCHAR(64)', 'attribute'], ['label', 'SMALLINT', 'attribute'],
]

const factFields = [
  ['flow_key', 'BIGSERIAL', 'PK'], ['date_key', 'INTEGER', 'FK'], ['time_key', 'INTEGER', 'FK'], ['source_host_key', 'INTEGER', 'FK'], ['dest_host_key', 'INTEGER', 'FK'], ['proto_service_key', 'INTEGER', 'FK'], ['attack_key', 'INTEGER', 'FK'], ['source_port', 'INTEGER', 'attribute'], ['dest_port', 'INTEGER', 'attribute'], ['duration', 'DOUBLE PRECISION', 'measure'], ['source_bytes', 'BIGINT', 'measure'], ['dest_bytes', 'BIGINT', 'measure'], ['source_pkts', 'INTEGER', 'measure'], ['dest_pkts', 'INTEGER', 'measure'], ['source_load', 'DOUBLE PRECISION', 'measure'], ['dest_load', 'DOUBLE PRECISION', 'measure'], ['source_ttl', 'INTEGER', 'measure'], ['dest_ttl', 'INTEGER', 'measure'], ['source_loss', 'INTEGER', 'measure'], ['dest_loss', 'INTEGER', 'measure'], ['source_jitter', 'DOUBLE PRECISION', 'measure'], ['dest_jitter', 'DOUBLE PRECISION', 'measure'], ['tcp_rtt', 'DOUBLE PRECISION', 'measure'], ['syn_ack', 'DOUBLE PRECISION', 'measure'], ['ack_dat', 'DOUBLE PRECISION', 'measure'], ['source_win', 'INTEGER', 'measure'], ['dest_win', 'INTEGER', 'measure'], ['trans_depth', 'INTEGER', 'measure'], ['res_bdy_len', 'BIGINT', 'measure'], ['ct_srv_src', 'INTEGER', 'measure'], ['ct_srv_dst', 'INTEGER', 'measure'], ['ct_dst_ltm', 'INTEGER', 'measure'], ['ct_src_ltm', 'INTEGER', 'measure'], ['ct_src_dport_ltm', 'INTEGER', 'measure'], ['ct_dst_sport_ltm', 'INTEGER', 'measure'], ['ct_dst_src_ltm', 'INTEGER', 'measure'], ['is_sm_ips_ports', 'SMALLINT', 'measure'], ['ct_state_ttl', 'INTEGER', 'measure'], ['ct_flw_http_mthd', 'INTEGER', 'measure'], ['is_ftp_login', 'SMALLINT', 'measure'], ['ct_ftp_cmd', 'INTEGER', 'measure'],
]

const toneClasses = {
  cyan: 'schema-table-cyan', violet: 'schema-table-violet', teal: 'schema-table-teal', amber: 'schema-table-amber', rose: 'schema-table-rose', slate: 'schema-table-slate',
}

function TableNode({ data }) {
  return <div className={`schema-table-node ${toneClasses[data.tone]}`}>
    <Handle type="target" position={Position.Left} />
    <Handle type="source" position={Position.Right} />
    <div className="schema-table-head"><div><p className="text-sm font-semibold text-white">{data.title}</p><p className="mt-1 text-[10px] text-slate-400">{data.subtitle}</p></div><span className="schema-field-count">{data.fields.length} cols</span></div>
    <div className="schema-field-list">{data.fields.map(([name, type, role]) => <div key={name} className="schema-field-row"><span className={`schema-role schema-role-${role}`}>{role === 'PK' ? 'PK' : role === 'FK' ? 'FK' : role === 'measure' ? 'M' : ''}</span><span className="schema-field-name">{name}</span><span className="schema-field-type">{type}</span></div>)}</div>
  </div>
}

const nodeTypes = { table: TableNode }

export default function SchemaDesignPage() {
  const { nodes, edges } = useMemo(() => {
    const nodes = [
      { id: 'staging', type: 'table', position: { x: -80, y: 650 }, data: { title: 'stg_network_flow', subtitle: 'Cleaned landing table', tone: 'slate', fields: stagingFields } },
      { id: 'date', type: 'table', position: { x: 60, y: -20 }, data: dimensions.dim_date },
      { id: 'time', type: 'table', position: { x: 420, y: -20 }, data: dimensions.dim_time },
      { id: 'host', type: 'table', position: { x: -320, y: 280 }, data: dimensions.dim_host },
      { id: 'protocol', type: 'table', position: { x: 800, y: 280 }, data: dimensions.dim_protocol_service },
      { id: 'attack', type: 'table', position: { x: 420, y: 720 }, data: dimensions.dim_attack_classification },
      { id: 'fact', type: 'table', position: { x: 300, y: 280 }, data: { title: 'fact_network_flow', subtitle: 'Event grain: one network flow', tone: 'violet', fields: factFields } },
    ]
    const edgeStyle = { stroke: '#64748b', strokeWidth: 1.5 }
    const edges = [
      ['date', 'fact', 'date_key'], ['time', 'fact', 'time_key'], ['host', 'fact', 'source_host_key / dest_host_key'], ['protocol', 'fact', 'proto_service_key'], ['attack', 'fact', 'attack_key'],
    ].map(([source, target, label]) => ({ id: `${source}-${target}`, source, target, label, type: 'smoothstep', style: edgeStyle, labelStyle: { fill: '#94a3b8', fontSize: 10 }, labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 }, labelBgPadding: [5, 3] }))
    return { nodes, edges }
  }, [])

  return <div className="min-h-screen"><header className="border-b border-slate-800/80 bg-[#0a0e1a]/90 px-8 py-7"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-400">Database documentation</p><h1 className="text-2xl font-bold text-white">Schema Design</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">ERD tương tác của staging và star schema PostgreSQL. Có thể zoom, kéo canvas và xem đầy đủ cột của từng bảng.</p></header><main className="space-y-6 p-8">
    <section className="glass-card p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2"><div><h2 className="text-base font-semibold text-white">Interactive ERD</h2><p className="mt-1 text-xs text-slate-500">PK = primary key · FK = foreign key · M = measure</p></div><div className="flex gap-2 text-[10px] text-slate-500"><span className="rounded border border-violet-500/30 px-2 py-1">Fact center</span><span className="rounded border border-cyan-500/30 px-2 py-1">Dimensions</span><span className="rounded border border-slate-500/30 px-2 py-1">Staging</span></div></div><div className="schema-flow-canvas"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.25} maxZoom={1.5} nodesDraggable nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background color="#334155" gap={24} size={1} /><Controls /><MiniMap nodeColor={node => node.data.tone === 'violet' ? '#a855f7' : node.data.tone === 'slate' ? '#64748b' : '#22d3ee'} maskColor="rgba(2, 6, 23, 0.7)" /></ReactFlow></div></section>
    <section className="glass-card p-6"><Title title="Model contract" subtitle="Các điểm cần nêu trong báo cáo" /><div className="grid gap-3 md:grid-cols-4"><Reason title="Grain" detail="One source dataset row becomes one fact_network_flow event." /><Reason title="Keys" detail="Dimensions expose surrogate keys; fact stores them as foreign keys." /><Reason title="Measures" detail="Bytes, packets, timing, loss and connection-profile metrics stay in fact." /><Reason title="Partition" detail="Fact is range-partitioned by date_key for the two collection periods." /></div></section>
    <section className="glass-card p-6"><Title title="Column lineage" subtitle="Fact không phải bản sao 49 cột của raw; nó thay thuộc tính mô tả bằng surrogate key" /><div className="grid gap-3 md:grid-cols-3"><LineageCard title="Moved to dimensions" detail="srcip/dstip -> dim_host; proto/service/state -> dim_protocol_service; attack_cat/label -> dim_attack_classification." tone="cyan" /><LineageCard title="Derived warehouse fields" detail="flow_key, host_key, proto_service_key, attack_key, date_key và time_key được tạo trong warehouse." tone="violet" /><LineageCard title="Current fact scope" detail="Fact giữ measures và các FK phục vụ OLAP. stcpb, dtcpb, smeansz, dmeansz, sinpkt, dinpkt hiện còn ở staging, chưa được fact loader chọn." tone="amber" /></div></section>
  </main></div>
}

function Title({ title, subtitle }) { return <div className="mb-5"><h2 className="text-base font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div> }
function Reason({ title, detail }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{title}</p><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div> }
function LineageCard({ title, detail, tone }) { const styles = { cyan: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300', violet: 'border-violet-500/20 bg-violet-500/5 text-violet-300', amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300' }; return <div className={`rounded-lg border p-4 ${styles[tone]}`}><p className="text-xs font-semibold">{title}</p><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div> }
