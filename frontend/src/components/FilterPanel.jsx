export default function FilterPanel({ filters, options, onChange, onReset }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <section className="glass-card p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-xs text-slate-400">
          Từ ngày
          <input type="date" value={filters.start_date} onChange={e => update('start_date', e.target.value)} className="mt-1 w-full input-control" />
        </label>
        <label className="text-xs text-slate-400">
          Đến ngày
          <input type="date" value={filters.end_date} onChange={e => update('end_date', e.target.value)} className="mt-1 w-full input-control" />
        </label>
        <label className="text-xs text-slate-400">
          Protocol
          <select value={filters.protocol} onChange={e => update('protocol', e.target.value)} className="mt-1 w-full input-control">
            <option value="">Tất cả</option>
            {options.protocols.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Loại tấn công
          <select value={filters.attack_category} onChange={e => update('attack_category', e.target.value)} className="mt-1 w-full input-control">
            <option value="">Tất cả</option>
            {options.attack_categories.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <button type="button" onClick={onReset} className="mt-3 text-xs text-cyan-400 hover:text-cyan-300">
        Xóa bộ lọc
      </button>
    </section>
  )
}
