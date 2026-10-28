import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function compact(value) { return value >= 1e9 ? `${(value / 1e9).toFixed(1)}G` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(0)}K` : value }

export default function ProtocolVolumeChart({ data }) {
  return <ResponsiveContainer width="100%" height={320}><BarChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="protocol" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} /><YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={compact} axisLine={false} tickLine={false} /><YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={compact} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(value, name) => [Number(value).toLocaleString(), name]} /><Legend /><Bar yAxisId="left" dataKey="bytes" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Bytes" /><Bar yAxisId="right" dataKey="flows" fill="#a855f7" radius={[4, 4, 0, 0]} name="Flows" /></BarChart></ResponsiveContainer>
}
