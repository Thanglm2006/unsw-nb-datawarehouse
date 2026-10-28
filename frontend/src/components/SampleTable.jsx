import { useState } from 'react'

export default function SampleTable({ data }) {
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filter, setFilter] = useState('')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  let filtered = data
  if (filter) {
    const q = filter.toLowerCase()
    filtered = data.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    )
  }

  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortField], vb = b[sortField]
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }

  const columns = [
    { key: 'srcip', label: 'IP Nguồn' },
    { key: 'sport', label: 'S.Port' },
    { key: 'dstip', label: 'IP Đích' },
    { key: 'dsport', label: 'D.Port' },
    { key: 'proto', label: 'Proto' },
    { key: 'service', label: 'Service' },
    { key: 'dur', label: 'Duration' },
    { key: 'sbytes', label: 'S.Bytes' },
    { key: 'dbytes', label: 'D.Bytes' },
    { key: 'attack_cat', label: 'Attack Type' },
    { key: 'Label', label: 'Label' },
  ]

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm IP, giao thức, tấn công..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        <span className="text-[11px] text-slate-500">
          {filtered.length} / {data.length} bản ghi
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/50">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800/90 backdrop-blur-sm">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left py-2.5 px-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 whitespace-nowrap border-b border-slate-700/50 select-none transition-colors"
                  >
                    {col.label}
                    {sortField === col.key && (
                      <span className="ml-1 text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/20 hover:bg-cyan-500/5 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className={`py-2 px-2.5 whitespace-nowrap ${
                      col.key === 'attack_cat' && row[col.key] !== 'Normal'
                        ? 'font-medium'
                        : ''
                    }`}>
                      {col.key === 'Label' ? (
                        row[col.key] === 1
                          ? <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-medium">Attack</span>
                          : <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-medium">Normal</span>
                      ) : col.key === 'attack_cat' ? (
                        <span className={row[col.key] !== 'Normal' ? 'text-red-400' : 'text-emerald-400'}>
                          {row[col.key]}
                        </span>
                      ) : col.key === 'srcip' || col.key === 'dstip' ? (
                        <span className="font-mono text-cyan-400/80">{row[col.key]}</span>
                      ) : col.key === 'dur' ? (
                        <span className="text-slate-400">{row[col.key]?.toFixed(4)}</span>
                      ) : typeof row[col.key] === 'number' ? (
                        <span className="text-slate-300">{row[col.key].toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">{row[col.key]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
