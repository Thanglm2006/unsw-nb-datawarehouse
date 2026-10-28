import { useQuery } from '@tanstack/react-query'
import { getEtlRuns, getEtlStatus } from '../api/etl'

export default function ETLPage() {
  const statusQuery = useQuery({ queryKey: ['etl', 'status'], queryFn: getEtlStatus, refetchInterval: 30_000 })
  const runsQuery = useQuery({ queryKey: ['etl', 'runs'], queryFn: () => getEtlRuns(20) })
  const loading = statusQuery.isLoading || runsQuery.isLoading
  const error = statusQuery.error || runsQuery.error
  const refresh = () => { statusQuery.refetch(); runsQuery.refetch() }

  const latest = statusQuery.data?.latest
  const counts = statusQuery.data?.counts || {}
  const quality = latest?.quality || {}
  const before = quality.before || {}
  const after = quality.after || quality
  const rules = quality.rules || []
  const runs = runsQuery.data || []

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800/80 bg-[#0a0e1a]/90 px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-400">Operational view</p><h1 className="text-2xl font-bold text-white">ETL & Data Quality</h1><p className="mt-1 text-sm text-slate-500">DuckDB làm sạch CSV, PostgreSQL lưu trữ và kiểm tra tính toàn vẹn.</p></div>
          <button type="button" onClick={refresh} className="page-button">{loading ? 'Đang tải...' : 'Làm mới trạng thái'}</button>
        </div>
      </header>
      <main className="space-y-6 p-8">
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error.message}</div>}
        <PipelineStatus status={latest?.status} />
        <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Metric label="Staging rows" value={counts.staging_rows} />
          <Metric label="Fact rows" value={counts.fact_rows} />
          <Metric label="Rejected" value={counts.rejected_rows} />
          <Metric label="Hosts" value={counts.hosts} />
          <Metric label="Proto/service" value={counts.protocol_services} />
          <Metric label="Attack categories" value={counts.attack_categories} />
        </section>
        <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          <div className="glass-card p-6"><SectionTitle title="Latest run" subtitle={latest ? new Date(latest.started_at).toLocaleString() : 'Chưa có lần chạy'} />
            <div className="space-y-3 text-sm">{latest ? <><Row label="Run ID" value={latest.run_id} mono /><Row label="Source rows" value={latest.source_rows?.toLocaleString()} /><Row label="Staging rows" value={latest.staging_rows?.toLocaleString()} /><Row label="Fact rows" value={latest.fact_rows?.toLocaleString()} /><Row label="Message" value={latest.message || 'No error'} /></> : <p className="text-slate-500">Chạy etl/run_etl.sh để tạo audit log.</p>}</div>
          </div>
          <div className="glass-card p-6"><SectionTitle title="Quality profile" subtitle="Tóm tắt từ lần ETL gần nhất" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3"><Quality label="Normal" value={after.normal_rows} /><Quality label="Attack" value={after.attack_rows} /><Quality label="Unknown service" value={after.unknown_service_rows} /><Quality label="Non-port source" value={after.non_port_source_rows} /><Quality label="Non-port dest" value={after.non_port_dest_rows} /><Quality label="Reject rows" value={counts.rejected_rows} /></div>
          </div>
        </section>
        <section className="glass-card p-6"><SectionTitle title="Cleaning before / after" subtitle="Các vấn đề phát hiện trong raw và trạng thái sau khi chuẩn hóa" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Compare label="Missing HTTP" before={before.missing_http} after={after.missing_http} /><Compare label="Missing FTP login" before={before.missing_ftp_login} after={after.missing_ftp_login} /><Compare label="Service '-'" before={before.service_dash} after={after.unknown_service_rows} /><Compare label="Attack NULL" before={before.attack_null} after={after.attack_null} /><Compare label="Invalid sport" before={before.sport_invalid} after={after.non_port_source_rows} /><Compare label="Invalid dsport" before={before.dsport_invalid} after={after.non_port_dest_rows} /><Compare label="Sport Hex" before={before.sport_hex} after="normalized" /><Compare label="Attack variants" before={before.attack_variants} after={after.attack_categories} /></div></section>
        {rules.length > 0 && <section className="glass-card overflow-hidden p-6"><SectionTitle title="Cleaning rules" subtitle="Quy tắc DuckDB đã áp dụng trong lần chạy gần nhất" /><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-500"><th className="py-3">Field</th><th>Raw problem</th><th>Transformation</th></tr></thead><tbody>{rules.map(rule => <tr key={rule.field} className="border-b border-slate-800/70"><td className="py-3 font-medium text-cyan-300">{rule.field}</td><td className="text-slate-400">{rule.problem}</td><td className="text-slate-300">{rule.action}</td></tr>)}</tbody></table></div></section>}
        <section className="glass-card overflow-hidden p-6"><SectionTitle title="Run history" subtitle="Audit trail của các lần full reload" /><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-700 text-slate-500"><th className="py-3">Started</th><th>Status</th><th>Source</th><th>Staging</th><th>Fact</th><th>Message</th></tr></thead><tbody>{runs.map(run => <tr key={run.run_id} className="border-b border-slate-800/70"><td className="py-3 text-slate-400">{new Date(run.started_at).toLocaleString()}</td><td><span className={`rounded-full px-2 py-1 ${run.status === 'success' ? 'bg-emerald-500/10 text-emerald-300' : run.status === 'failed' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>{run.status}</span></td><td>{run.source_rows?.toLocaleString() || '—'}</td><td>{run.staging_rows?.toLocaleString() || '—'}</td><td>{run.fact_rows?.toLocaleString() || '—'}</td><td className="max-w-xs truncate text-slate-500">{run.message || '—'}</td></tr>)}</tbody></table></div></section>
      </main>
    </div>
  )
}

function PipelineStatus({ status }) { const steps = ['DuckDB extract', 'Clean + validate', 'PostgreSQL staging', 'Dimensions + fact', 'Analytics refresh']; const complete = status === 'success'; return <section className="glass-card p-6"><SectionTitle title="Pipeline status" subtitle="Một lần chạy đầy đủ của ETL" /><div className="grid gap-2 md:grid-cols-5">{steps.map((step, index) => <div key={step} className={`rounded-lg border p-4 ${complete ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/40'}`}><div className={`mb-3 h-2 rounded-full ${complete ? 'bg-emerald-400' : 'bg-slate-700'}`} /><p className="text-xs font-medium text-slate-300">{index + 1}. {step}</p></div>)}</div></section> }
function SectionTitle({ title, subtitle }) { return <div className="mb-5"><h2 className="text-base font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div> }
function Metric({ label, value }) { return <div className="glass-card p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-lg font-bold text-cyan-300">{value === undefined || value === null ? '—' : Number(value).toLocaleString()}</p></div> }
function Quality({ label, value }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-200">{value === undefined || value === null ? '—' : Number(value).toLocaleString()}</p></div> }
function Compare({ label, before, after }) { return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><p className="text-[10px] text-slate-500">{label}</p><div className="mt-2 flex items-end justify-between gap-2"><div><p className="text-[10px] uppercase text-slate-600">Before</p><p className="font-semibold text-amber-300">{before === undefined || before === null ? '—' : Number(before).toLocaleString()}</p></div><span className="text-slate-600">→</span><div className="text-right"><p className="text-[10px] uppercase text-slate-600">After</p><p className="font-semibold text-emerald-300">{after === undefined || after === null ? '—' : typeof after === 'string' ? after : Number(after).toLocaleString()}</p></div></div></div> }
function Row({ label, value, mono }) { return <div className="flex items-center justify-between gap-4 border-b border-slate-800/70 pb-2"><span className="text-slate-500">{label}</span><span className={`max-w-[65%] truncate text-right text-slate-200 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span></div> }
