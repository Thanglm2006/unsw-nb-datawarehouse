import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#06b6d4','#f43f5e','#a855f7','#f97316','#10b981','#6366f1','#eab308','#ec4899','#14b8a6','#8b5cf6','#64748b','#fb923c','#38bdf8','#4ade80','#c084fc']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white font-semibold text-sm mb-1">{label}</p>
      <p className="text-xs text-slate-300">Số lượng: <span className="text-cyan-400 font-bold">{payload[0].value.toLocaleString()}</span></p>
    </div>
  )
}

export default function ServiceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
        <YAxis type="category" dataKey="service" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} width={60} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
