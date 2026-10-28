import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#06b6d4','#f43f5e','#a855f7','#f97316','#10b981','#6366f1','#eab308','#ec4899','#14b8a6','#8b5cf6']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white font-semibold text-sm mb-1">{label}</p>
      <p className="text-slate-300 text-xs">Số lượng: <span className="text-cyan-400 font-bold">{payload[0].value.toLocaleString()}</span></p>
    </div>
  )
}

export default function AttackByCategoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
          angle={-35}
          textAnchor="end"
          axisLine={{ stroke: '#1e293b' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
