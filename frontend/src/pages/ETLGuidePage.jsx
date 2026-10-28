const pipeline = [
  { number: '01', title: 'Raw source', label: '4 CSV UNSW-NB15', detail: '2.54M network-flow records, 49 fields, no header row.', tone: 'cyan' },
  { number: '02', title: 'DuckDB extract', label: 'Read as VARCHAR', detail: 'Keep dirty ports and blanks intact before applying typed rules.', tone: 'violet' },
  { number: '03', title: 'Clean + enrich', label: 'DuckDB SQL', detail: 'Normalize values, parse timestamps, create date_key/time_key.', tone: 'amber' },
  { number: '04', title: 'Staging load', label: 'PostgreSQL COPY', detail: 'Bulk-load the cleaned relation into stg_network_flow.', tone: 'teal' },
  { number: '05', title: 'Star schema', label: 'Dimensions + fact', detail: 'Generate surrogate keys and load the network-flow fact grain.', tone: 'rose' },
  { number: '06', title: 'Serving layer', label: 'Views + API + UI', detail: 'Refresh aggregates, expose filtered API queries and visualize results.', tone: 'blue' },
]

const rules = [
  ['Structure', 'CSV has no header; BOM may exist', 'DuckDB assigns the 49-column schema by position', 'Typed raw relation'],
  ['sport / dsport', 'Decimal, Hex, -, overflow', 'try_cast; valid range 0..65535; non-port -> -1', 'Integer port fields'],
  ['HTTP / FTP counters', 'Blank values', 'coalesce numeric conversion with 0', 'No missing counters'],
  ['service', "'-' or blank", "Trim and map to 'unknown'", 'Stable service dimension'],
  ['attack_cat', 'NULL, spaces, Backdoors', 'Normal for label 0; trim; Backdoors -> Backdoor', 'Canonical categories'],
  ['Stime / Ltime', 'Unix epoch seconds', 'UTC timestamp plus date_key/time_key', 'Date/time dimensions'],
  ['Numeric measures', 'Dirty strings or invalid values', 'try_cast without aborting the relation', 'Typed staging columns'],
]

const toneStyles = {
  cyan: 'border-cyan-500/25 bg-cyan-500/5 text-cyan-300',
  violet: 'border-violet-500/25 bg-violet-500/5 text-violet-300',
  amber: 'border-amber-500/25 bg-amber-500/5 text-amber-300',
  teal: 'border-teal-500/25 bg-teal-500/5 text-teal-300',
  rose: 'border-rose-500/25 bg-rose-500/5 text-rose-300',
  blue: 'border-blue-500/25 bg-blue-500/5 text-blue-300',
}

export default function ETLGuidePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800/80 bg-[#0a0e1a]/90 px-8 py-7">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-400">Documentation view</p>
        <h1 className="text-2xl font-bold text-white">ETL Design Guide</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Một trang tóm tắt dùng để trình bày bài toán: dữ liệu raw được làm sạch bằng DuckDB, nạp vào PostgreSQL theo mô hình star schema, sau đó phục vụ qua API và dashboard.</p>
      </header>
      <main className="space-y-6 p-8">
        <section className="glass-card p-6"><GuideTitle title="Pipeline design" subtitle="Luồng xử lý từ nguồn dữ liệu đến lớp trực quan hóa" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{pipeline.map(step => <div key={step.number} className={`rounded-xl border p-5 ${toneStyles[step.tone]}`}><div className="mb-4 flex items-center justify-between"><span className="text-2xl font-bold text-white">{step.number}</span><span className="rounded-full bg-slate-950/30 px-2 py-1 text-[10px] uppercase tracking-wider">{step.label}</span></div><h2 className="text-sm font-semibold text-white">{step.title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{step.detail}</p></div>)}</div></section>

        <section className="glass-card p-6"><GuideTitle title="Cleaning rules" subtitle="Quy tắc biến đổi được thực hiện trong etl/clean_staging.sql" /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-500"><th className="py-3 pr-4">Field / concern</th><th className="pr-4">Raw issue</th><th className="pr-4">DuckDB transformation</th><th>Output contract</th></tr></thead><tbody>{rules.map(rule => <tr key={rule[0]} className="border-b border-slate-800/70"><td className="py-3 pr-4 font-medium text-cyan-300">{rule[0]}</td><td className="pr-4 text-amber-200/80">{rule[1]}</td><td className="pr-4 text-slate-300">{rule[2]}</td><td className="text-emerald-300">{rule[3]}</td></tr>)}</tbody></table></div></section>

        <section className="grid gap-6 xl:grid-cols-2"><div className="glass-card p-6"><GuideTitle title="Warehouse model" subtitle="Fact grain: one network flow record" /><div className="space-y-3"><ModelRow name="dim_date" detail="date_key, calendar attributes, weekend/business flags" tone="cyan" /><ModelRow name="dim_time" detail="time_key, hour, bucket, business-hour flag" tone="violet" /><ModelRow name="dim_host" detail="source/destination IP and network attributes" tone="teal" /><ModelRow name="dim_protocol_service" detail="protocol + service + state combination" tone="amber" /><ModelRow name="dim_attack_classification" detail="canonical category and attack label" tone="rose" /><div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4"><p className="text-sm font-semibold text-cyan-300">fact_network_flow</p><p className="mt-1 text-xs leading-5 text-slate-400">Foreign keys to all dimensions plus measures: duration, bytes, packets, loads, TTL, loss, jitter, TCP metrics and connection counters.</p></div></div></div><div className="glass-card p-6"><GuideTitle title="Validation contract" subtitle="Các điều kiện để một lần ETL được xem là thành công" /><div className="space-y-3 text-sm">{['source_rows = cleaned_rows', 'staging_rows = fact_rows', 'port values are within -1..65535', 'attack_cat and service are canonical', 'audit status is success', 'materialized views are refreshed'].map((item, index) => <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-300">{index + 1}</span><span className="text-slate-300">{item}</span></div>)}</div></div></section>

        <section className="glass-card p-6"><GuideTitle title="How to explain the project" subtitle="Trình tự thuyết trình ngắn gọn" /><div className="grid gap-3 md:grid-cols-4"><TalkCard title="Problem" detail="Raw data has no header, mixed port formats, blanks and inconsistent labels." /><TalkCard title="Method" detail="DuckDB performs reproducible SQL cleaning and PostgreSQL receives typed rows with COPY." /><TalkCard title="Model" detail="The star schema separates descriptive dimensions from measurable network-flow events." /><TalkCard title="Evidence" detail="Audit rows, before/after quality metrics, row-count checks and dashboard analytics." /></div></section>
      </main>
    </div>
  )
}

function GuideTitle({ title, subtitle }) { return <div className="mb-5"><h2 className="text-base font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div> }
function ModelRow({ name, detail, tone }) { return <div className={`rounded-lg border p-3 ${toneStyles[tone]}`}><p className="text-xs font-semibold">{name}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div> }
function TalkCard({ title, detail }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{title}</p><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div> }
