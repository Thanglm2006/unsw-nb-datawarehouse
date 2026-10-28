import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function BytesTimelineChart({ data }) {
  const rows = data.map(row => ({ ...row, source_mb: Number(row.source_bytes || 0) / 1048576, dest_mb: Number(row.dest_bytes || 0) / 1048576 }))
  return <ResponsiveContainer width="100%" height={280}><LineChart data={rows} margin={{ top: 10, right: 10, left: 8, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} /><YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={value => `${value.toFixed(0)}M`} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(value, name) => [`${Number(value).toFixed(2)} MB`, name]} /><Legend /><Line type="monotone" dataKey="source_mb" stroke="#06b6d4" strokeWidth={2} dot={false} name="Source MB" /><Line type="monotone" dataKey="dest_mb" stroke="#f97316" strokeWidth={2} dot={false} name="Destination MB" /></LineChart></ResponsiveContainer>
}
