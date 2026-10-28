import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const PROTO_COLORS = ['#06b6d4', '#f43f5e', '#a855f7', '#f97316', '#10b981']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white font-semibold text-sm mb-2">{label}</p>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <p key={i} className="text-xs flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.dataKey}</span>
          <span className="text-white font-semibold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

export default function AttackByProtocolChart({ data }) {
  const { protocols, data: chartData } = data

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
          angle={-35}
          textAnchor="end"
          axisLine={{ stroke: '#1e293b' }}
          tickLine={false}
        />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
        {protocols.map((proto, i) => (
          <Bar key={proto} dataKey={proto} stackId="a" fill={PROTO_COLORS[i] || '#64748b'} name={proto} radius={i === protocols.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
