const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'etl', label: 'ETL & Data Quality', icon: '⇄' },
  { id: 'etl-flow', label: 'ETL Flow', icon: '⇢' },
  { id: 'schema', label: 'Schema Design', icon: '▤' },
  { id: 'query', label: 'Dashboard Query', icon: '⌕' },
]

export default function AppShell({ page, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#0d1224]/95 backdrop-blur-xl">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-lg font-bold text-cyan-300">DW</div>
            <div>
              <h1 className="text-sm font-bold text-white">UNSW-NB15</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Data warehouse</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
          <div className="space-y-1">
            {navItems.map(item => (
              <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${page === item.id ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}`}>
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />PostgreSQL DW</div>
        </div>
      </aside>
      <main className="min-h-screen pl-64">{children}</main>
    </div>
  )
}
