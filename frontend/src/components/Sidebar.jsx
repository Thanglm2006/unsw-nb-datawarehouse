const navItems = [
  { id: 'overview', icon: '📊', label: 'Tổng quan' },
  { id: 'attack-category', icon: '🛡️', label: 'Loại tấn công' },
  { id: 'timeline', icon: '📅', label: 'Theo ngày' },
  { id: 'hourly', icon: '🕐', label: 'Theo giờ' },
  { id: 'protocol-service', icon: '📡', label: 'Giao thức & Dịch vụ' },
  { id: 'attack-protocol', icon: '⚔️', label: 'Tấn công × Giao thức' },
  { id: 'top-ips', icon: '🌐', label: 'Top IP' },
  { id: 'data-table', icon: '📋', label: 'Dữ liệu mẫu' },
]

export default function Sidebar({ activeSection, data }) {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#0d1224]/90 backdrop-blur-xl border-r border-slate-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
            DW
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">UNSW-NB15</h1>
            <p className="text-[10px] text-slate-500 font-medium">DATA WAREHOUSE</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest px-2 mb-3">Điều hướng</p>
        <ul className="space-y-0.5">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className={`nav-item w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-all ${
                  activeSection === item.id
                    ? 'active bg-cyan-500/10 text-cyan-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Stats */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Tổng bản ghi</span>
          <span className="text-cyan-400 font-semibold">{(data.total_records / 1000000).toFixed(2)}M</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Tỉ lệ tấn công</span>
          <span className="text-red-400 font-semibold">{data.attack_percent}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot"></div>
          Dataset UNSW-NB15
        </div>
      </div>
    </aside>
  )
}

