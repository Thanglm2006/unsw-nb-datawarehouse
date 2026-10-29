const requestFlow = [
  ['01', 'React page', 'User changes date/protocol/attack filters or opens a page.'],
  ['02', 'TanStack Query', 'Builds a stable query key, caches the result and manages loading/error state.'],
  ['03', 'Axios client', 'Adds the configured API base URL and serializes non-empty query parameters.'],
  ['04', 'FastAPI route', 'Validates parameters with Pydantic types and builds parameterized SQL.'],
  ['05', 'PostgreSQL', 'Reads materialized views for fixed aggregates or fact + dimensions for dynamic filters.'],
  ['06', 'JSON response', 'Charts and tables receive only the data they need; flow search stays paginated.'],
]

const endpoints = [
  ['GET /api/v1/metrics/overview', 'KPI cards', 'fact_network_flow + dimensions', 'total, normal/attack count, unique hosts/protocols/services'],
  ['GET /api/v1/attacks/distribution', 'Attack chart', 'fact + dim_attack_classification', 'count by canonical attack category'],
  ['GET /api/v1/traffic/timeseries', 'Daily timeline', 'fact + dim_date', 'flow count, normal/attack count, bytes by date'],
  ['GET /api/v1/traffic/hourly', 'Hourly chart', 'fact + dim_time', 'flow count by hour'],
  ['GET /api/v1/flows/search', 'Flow table', 'fact + all relevant dimensions', 'filtered rows with limit/offset pagination'],
  ['GET /api/v1/etl/status', 'ETL page', 'etl_run_audit + table counts', 'latest run, quality metrics and row counts'],
]

const params = [
  ['start_date', 'date', '2015-01-22', 'Lower date boundary'],
  ['end_date', 'date', '2015-02-18', 'Upper date boundary'],
  ['protocol', 'string', 'tcp', 'Filter protocol_name'],
  ['attack_category', 'string', 'Generic', 'Filter attack_category'],
  ['q', 'string', '59.166.0.2', 'Search IP or service in flow table'],
  ['limit / offset', 'integer', '50 / 0', 'Server-side pagination'],
]

export default function DashboardQueryPage() {
  return <div className="min-h-screen"><header className="border-b border-slate-800/80 bg-[#0a0e1a]/90 px-8 py-7"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-400">Serving layer documentation</p><h1 className="text-2xl font-bold text-white">Dashboard Query</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Cách dashboard lấy dữ liệu từ PostgreSQL qua FastAPI, từ thao tác filter của người dùng đến JSON response của từng biểu đồ.</p></header><main className="space-y-6 p-8">
    <section className="glass-card p-6"><Title title="Request lifecycle" subtitle="Một request đi qua các lớp của ứng dụng như thế nào" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{requestFlow.map(([number, title, detail]) => <div key={number} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5"><div className="mb-4 flex items-center justify-between"><span className="text-2xl font-bold text-white">{number}</span><span className="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] uppercase tracking-wider text-blue-300">layer</span></div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div>)}</div></section>

    <section className="glass-card p-6"><Title title="Dashboard endpoints" subtitle="Endpoint nào phục vụ phần nào trên giao diện" /><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-500"><th className="py-3 pr-4">Endpoint</th><th className="pr-4">UI usage</th><th className="pr-4">Data source</th><th>Returned data</th></tr></thead><tbody>{endpoints.map(row => <tr key={row[0]} className="border-b border-slate-800/70"><td className="py-3 pr-4 font-mono text-cyan-300">{row[0]}</td><td className="pr-4 text-slate-300">{row[1]}</td><td className="pr-4 text-amber-200/80">{row[2]}</td><td className="text-slate-400">{row[3]}</td></tr>)}</tbody></table></div></section>

    <section className="grid gap-6 xl:grid-cols-2"><div className="glass-card p-6"><Title title="Query parameters" subtitle="Các filter dùng chung trong dashboard" /><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-500"><th className="py-3 pr-4">Parameter</th><th className="pr-4">Type</th><th className="pr-4">Example</th><th>Meaning</th></tr></thead><tbody>{params.map(row => <tr key={row[0]} className="border-b border-slate-800/70"><td className="py-3 pr-4 font-mono text-cyan-300">{row[0]}</td><td className="pr-4 text-violet-300">{row[1]}</td><td className="pr-4 font-mono text-amber-200/80">{row[2]}</td><td className="text-slate-400">{row[3]}</td></tr>)}</tbody></table></div></div><div className="glass-card p-6"><Title title="Example request" subtitle="Một query lấy flows bị tấn công theo protocol trong một khoảng ngày" /><pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-[11px] leading-6 text-cyan-200"><code>{`GET /api/v1/flows/search?start_date=2015-01-22&end_date=2015-02-18&protocol=tcp&attack_category=Generic&limit=50&offset=0`}</code></pre><p className="mt-4 text-xs leading-5 text-slate-500">Backend trả về <code className="text-cyan-300">items</code>, <code className="text-cyan-300">total</code>, <code className="text-cyan-300">limit</code> và <code className="text-cyan-300">offset</code>, nên frontend không phải tải toàn bộ fact table.</p></div></section>

    <section className="glass-card p-6"><Title title="SQL strategy" subtitle="Tại sao dashboard dùng hai kiểu truy vấn" /><div className="grid gap-3 md:grid-cols-2"><QueryCard title="Materialized views" tone="cyan" detail="Dùng cho các aggregate ổn định như attack distribution, daily traffic, hourly traffic và top IP. ETL refresh sau mỗi lần load fact." code="SELECT * FROM mv_traffic_timeseries ORDER BY date" /><QueryCard title="Dynamic fact queries" tone="violet" detail="Dùng cho filter kết hợp ngày + protocol + attack + search. FastAPI JOIN fact với các dimension và truyền parameterized SQL." code="WHERE d.full_date >= $1 AND p.protocol_name = $3" /></div></section>

    <section className="glass-card p-6"><Title title="Query design principles" subtitle="Các điểm cần nêu khi báo cáo lớp serving" /><div className="grid gap-3 md:grid-cols-4"><Principle title="Validated" detail="FastAPI kiểm tra date, limit và offset trước khi query." /><Principle title="Parameterized" detail="Giá trị filter đi qua query parameters, không nối chuỗi SQL từ user input." /><Principle title="Paginated" detail="Flow table chỉ tải 50 rows mỗi lần, không tải toàn bộ fact." /><Principle title="Cached" detail="TanStack Query giữ cache theo filter/page và tránh request lặp." /></div></section>
  </main></div>
}

function Title({ title, subtitle }) { return <div className="mb-5"><h2 className="text-base font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div> }
function QueryCard({ title, tone, detail, code }) { const style = tone === 'cyan' ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-violet-500/20 bg-violet-500/5 text-violet-300'; return <div className={`rounded-xl border p-5 ${style}`}><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p><code className="mt-4 block rounded bg-slate-950/50 p-3 text-[10px] text-slate-300">{code}</code></div> }
function Principle({ title, detail }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{title}</p><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></div> }
