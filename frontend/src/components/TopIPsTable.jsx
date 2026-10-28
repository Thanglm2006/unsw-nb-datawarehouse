export default function TopIPsTable({ data, label }) {
  const max = Math.max(...data.map(d => d.attack_count))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-2.5 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold w-8">#</th>
            <th className="text-left py-2.5 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{label}</th>
            <th className="text-right py-2.5 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Lượt tấn công</th>
            <th className="py-2.5 px-3 w-1/3"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors group">
              <td className="py-2.5 px-3">
                <span className={`text-xs font-bold ${i < 3 ? 'text-red-400' : 'text-slate-600'}`}>
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 px-3 font-mono text-cyan-400 text-xs group-hover:text-cyan-300 transition-colors">{row.ip}</td>
              <td className="py-2.5 px-3 text-right text-slate-300 text-xs font-semibold">{row.attack_count.toLocaleString()}</td>
              <td className="py-2.5 px-3">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${i < 3 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-slate-600'}`}
                    style={{ width: `${(row.attack_count / max) * 100}%` }}
                  ></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
