import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#06b6d4','#f43f5e','#a855f7','#f97316','#10b981','#6366f1','#eab308','#ec4899','#14b8a6','#8b5cf6','#64748b','#fb923c','#38bdf8','#4ade80','#c084fc']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white font-semibold text-sm">{d.name}</p>
      <p className="text-xs text-slate-300">Số lượng: <span className="text-cyan-400 font-bold">{d.value.toLocaleString()}</span></p>
      <p className="text-xs text-slate-400">{(d.payload.percent * 100).toFixed(1)}%</p>
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, protocol, percent }) => {
  if (percent < 0.03) return null
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#94a3b8" fontSize={11} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {protocol} ({(percent * 100).toFixed(1)}%)
    </text>
  )
}

export default function ProtocolChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const withPercent = data.map(d => ({ ...d, percent: d.count / total }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={withPercent}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={100}
          dataKey="count"
          nameKey="protocol"
          label={renderLabel}
          labelLine={{ stroke: '#334155', strokeWidth: 1 }}
          strokeWidth={2}
          stroke="#0a0e1a"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
