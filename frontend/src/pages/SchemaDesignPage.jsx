const dimensions = [
  ['dim_date', 'date_key', 'Calendar attributes: full date, year, quarter, month, weekday and weekend flag.'],
  ['dim_time', 'time_key', 'Time-of-day attributes: hour, minute, second, bucket and business-hour flag.'],
  ['dim_host', 'host_key', 'One row per IP address with subnet prefix, internal-network flag and IP class.'],
  ['dim_protocol_service', 'proto_service_key', 'Unique protocol + service + state combination for reusable lookup.'],
  ['dim_attack_classification', 'attack_key', 'Canonical attack category, binary label and threat severity.'],
]

const measures = [
  ['Traffic', 'duration, source_bytes, dest_bytes, source_pkts, dest_pkts'],
  ['Network', 'source_load, dest_load, source_ttl, dest_ttl, source_loss, dest_loss'],
  ['Timing', 'source_jitter, dest_jitter, tcp_rtt, syn_ack, ack_dat'],
  ['Connection profile', 'window sizes, trans_depth, res_bdy_len, HTTP/FTP counters'],
  ['Behavior counts', 'ct_srv_src, ct_srv_dst, ct_dst_ltm, ct_src_ltm and related fields'],
]

export default function SchemaDesignPage() {
  return <div className="min-h-screen"><header className="border-b border-slate-800/80 bg-[#0a0e1a]/90 px-8 py-7"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-400">Database documentation</p><h1 className="text-2xl font-bold text-white">Schema Design</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Thiết kế staging và star schema PostgreSQL: grain, surrogate keys, foreign keys, measures và partition strategy.</p></header><main className="space-y-6 p-8">
    <section className="glass-card p-6"><Title title="Model overview" subtitle="Staging giữ dữ liệu typed; star schema tối ưu cho phân tích" /><div className="grid gap-3 md:grid-cols-3"><ModelCard name="stg_network_flow" kind="STAGING" detail="Temporary landing table. Stores cleaned source attributes before dimensional lookup." tone="amber" /><ModelCard name="Dimensions" kind="CONTEXT" detail="Five descriptive tables provide reusable keys and analytical context." tone="cyan" /><ModelCard name="fact_network_flow" kind="EVENT" detail="One row per network flow, linked to every dimension through surrogate keys." tone="violet" /></div></section>
    <section className="glass-card p-6"><Title title="Dimension tables" subtitle="Các bảng mô tả đứng ở các nhánh của star schema" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dimensions.map(([name, key, detail]) => <div key={name} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold text-white">{name}</h2><span className="rounded bg-cyan-500/15 px-2 py-1 font-mono text-[10px] text-cyan-300">{key}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">{detail}</p></div>)}</div></section>
    <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><div className="glass-card p-6"><Title title="Fact table contract" subtitle="fact_network_flow" /><div className="space-y-3"><Info label="Grain" value="One source dataset row = one network-flow event" /><Info label="Primary key" value="(flow_key, date_key)" /><Info label="Foreign keys" value="date, time, source host, destination host, protocol/service and attack" /><Info label="Partitioning" value="Range partition by date_key with Jan/Feb 2015 partitions and default partition" /></div></div><div className="glass-card p-6"><Title title="Measures" subtitle="Các nhóm đại lượng được lưu trong fact" /><div className="space-y-3">{measures.map(([name, detail]) => <div key={name} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><p className="text-xs font-semibold text-violet-300">{name}</p><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div>)}</div></div></section>
    <section className="glass-card p-6"><Title title="Why this design" subtitle="Cách giải thích mô hình trong báo cáo" /><div className="grid gap-3 md:grid-cols-4"><Reason title="Separation" detail="Dimensions describe who, when, what protocol and what attack." /><Reason title="Performance" detail="Fact is partitioned by date and indexed on analytical foreign keys." /><Reason title="Consistency" detail="Surrogate keys stabilize joins and canonical categories prevent duplicate members." /><Reason title="Analytics" detail="Materialized views precompute dashboard metrics without changing the source grain." /></div></section>
  </main></div>
}

function Title({ title, subtitle }) { return <div className="mb-5"><h2 className="text-base font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div> }
function ModelCard({ name, kind, detail, tone }) { const styles = { amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300', cyan: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300', violet: 'border-violet-500/20 bg-violet-500/5 text-violet-300' }; return <div className={`rounded-xl border p-5 ${styles[tone]}`}><p className="text-[10px] uppercase tracking-wider">{kind}</p><h2 className="mt-2 text-base font-semibold text-white">{name}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div> }
function Info({ label, value }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 text-xs leading-5 text-slate-300">{value}</p></div> }
function Reason({ title, detail }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{title}</p><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div> }
