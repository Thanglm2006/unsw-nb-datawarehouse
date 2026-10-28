const colorMap = {
  cyan:   { bg: 'from-cyan-500/15 to-cyan-500/5',    border: 'border-cyan-500/20',   text: 'text-cyan-400',    glow: 'stat-glow-cyan' },
  green:  { bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'stat-glow-green' },
  red:    { bg: 'from-red-500/15 to-red-500/5',      border: 'border-red-500/20',     text: 'text-red-400',     glow: 'stat-glow-red' },
  purple: { bg: 'from-purple-500/15 to-purple-500/5', border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'stat-glow-purple' },
}

export default function StatCard({ title, value, subtitle, icon, color = 'cyan', large }) {
  const c = colorMap[color] || colorMap.cyan

  return (
    <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl ${large ? 'p-5' : 'p-4'} ${c.glow} transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{title}</p>
        <span className={`text-lg ${large ? 'text-xl' : ''}`}>{icon}</span>
      </div>
      <p className={`${large ? 'text-3xl' : 'text-2xl'} font-extrabold ${c.text} tracking-tight`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  )
}
