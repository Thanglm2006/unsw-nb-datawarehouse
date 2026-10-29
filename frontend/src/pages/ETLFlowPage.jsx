const steps = [
  ['01', 'Raw source', '4 CSV files', '2.54M records, 49 fields, no header row.'],
  ['02', 'DuckDB extract', 'read_csv as VARCHAR', 'Preserve Hex ports and blanks before cleaning.'],
  ['03', 'Clean + enrich', 'DuckDB SQL', 'Normalize values, type measures, parse timestamps and keys.'],
  ['04', 'Staging load', 'PostgreSQL COPY', 'Bulk-load typed rows into stg_network_flow.'],
  ['05', 'Warehouse load', 'Dimensions + fact', 'Build surrogate keys and load one row per network flow.'],
  ['06', 'Serve + visualize', 'Views -> API -> React', 'Refresh aggregates and expose dashboard queries.'],
]

const rules = [
  ['sport / dsport', 'Hex, decimal, -, overflow', 'Valid 0..65535; non-port -> -1'],
  ['HTTP / FTP counters', 'Blank values', 'Numeric conversion with missing -> 0'],
  ['service', "'-' or blank", "Trim and map to 'unknown'"],
  ['attack_cat', 'NULL, spaces, Backdoors', 'Normal for label 0; trim; Backdoors -> Backdoor'],
  ['Stime / Ltime', 'Unix epoch seconds', 'UTC timestamp + date_key/time_key'],
  ['Numeric fields', 'Dirty strings', 'try_cast to typed staging fields'],
]

export default function ETLFlowPage() {
  return <div className="min-h-screen"><PageHeader eyebrow="Process documentation" title="ETL Flow" subtitle="Luồng dữ liệu từ CSV raw đến dashboard, trình bày theo đúng thứ tự thực thi." /><main className="space-y-6 p-8">
    <section className="glass-card p-6"><Title title="Pipeline execution" subtitle="Các phase chính của một lần full reload" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{steps.map(([number, title, label, detail]) => <div key={number} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5"><div className="mb-4 flex items-center justify-between"><span className="text-2xl font-bold text-white">{number}</span><span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300">{label}</span></div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div>)}</div></section>
    <section className="glass-card p-6"><Title title="Cleaning rules" subtitle="Các quy tắc được triển khai trong etl/clean_staging.sql" /><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-500"><th className="py-3 pr-4">Field</th><th className="pr-4">Raw issue</th><th>Transformation</th></tr></thead><tbody>{rules.map(row => <tr key={row[0]} className="border-b border-slate-800/70"><td className="py-3 pr-4 font-medium text-cyan-300">{row[0]}</td><td className="pr-4 text-amber-200/80">{row[1]}</td><td className="text-emerald-300">{row[2]}</td></tr>)}</tbody></table></div></section>
    <section className="grid gap-6 xl:grid-cols-2"><div className="glass-card p-6"><Title title="Load sequence" subtitle="run_etl.py điều phối các bước theo thứ tự" /><ol className="space-y-3">{['Read all raw CSV relations with DuckDB', 'Collect raw quality counts', 'Create cleaned_flows relation', 'Export clean rows to temporary CSV', 'COPY rows into PostgreSQL staging', 'Execute dimensions, fact and analytics SQL', 'Compare source/staging/fact counts and write audit'].map((item, index) => <li key={item} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300"><span className="text-cyan-300">{index + 1}.</span>{item}</li>)}</ol></div><div className="glass-card p-6"><Title title="Validation contract" subtitle="Điều kiện để run được ghi nhận success" /><div className="space-y-3">{['source_rows = cleaned_rows', 'staging_rows = fact_rows', 'ports remain in -1..65535', 'canonical service and attack labels', 'materialized views refreshed', 'etl_run_audit.status = success'].map(item => <div key={item} className="flex items-center gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs text-slate-300"><span className="text-emerald-300">✓</span>{item}</div>)}</div></div></section>
  </main></div>
}

function PageHeader({ eyebrow, title, subtitle }) { return <header className="border-b border-slate-800/80 bg-[#0a0e1a]/90 px-8 py-7"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-400">{eyebrow}</p><h1 className="text-2xl font-bold text-white">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p></header> }
function Title({ title, subtitle }) { return <div className="mb-5"><h2 className="text-base font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div> }
