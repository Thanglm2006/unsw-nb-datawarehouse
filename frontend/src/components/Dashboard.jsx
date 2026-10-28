import StatCard from './StatCard'
import AttackByCategoryChart from './AttackByCategoryChart'
import AttackByDateChart from './AttackByDateChart'
import AttackByHourChart from './AttackByHourChart'
import ProtocolChart from './ProtocolChart'
import ServiceChart from './ServiceChart'
import TopIPsTable from './TopIPsTable'
import AttackByProtocolChart from './AttackByProtocolChart'
import SampleTable from './SampleTable'
import FilterPanel from './FilterPanel'
import PortRangeChart from './PortRangeChart'
import DurationChart from './DurationChart'
import BytesTimelineChart from './BytesTimelineChart'

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="text-2xl">{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function Dashboard({ data, filters, options, onFiltersChange, onResetFilters, onPageChange, onSearch, page }) {
  const s = data.summary

  return (
    <div className="min-h-screen">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">Network Security Dashboard</h1>
            <p className="text-[11px] text-slate-500">Phân tích lưu lượng mạng & phát hiện xâm nhập — UNSW-NB15 Dataset</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot"></div>
              {s.total_records.toLocaleString()} records
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        <FilterPanel
          filters={filters}
          options={options}
          onChange={onFiltersChange}
          onReset={onResetFilters}
        />

        {/* ===== OVERVIEW ===== */}
        <section id="overview" className="scroll-mt-20">
          <SectionHeader icon="📊" title="Tổng quan hệ thống" subtitle={`Số liệu thống kê chính từ ${s.total_records.toLocaleString()} bản ghi mạng`} />
          
          {/* Main stats row */}
          <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tổng bản ghi"
              value={s.total_records.toLocaleString()}
              icon="📊"
              color="cyan"
              large
            />
            <StatCard
              title="Bình thường"
              value={s.normal_count.toLocaleString()}
              subtitle={`${s.normal_percent}%`}
              icon="✅"
              color="green"
              large
            />
            <StatCard
              title="Tấn công"
              value={s.attack_count.toLocaleString()}
              subtitle={`${s.attack_percent}%`}
              icon="🔴"
              color="red"
              large
            />
            <StatCard
              title="Loại tấn công"
              value={s.attack_categories.filter(c => c !== 'Normal').length}
              subtitle="danh mục"
              icon="🛡️"
              color="purple"
              large
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MiniStat label="IP nguồn" value={s.unique_source_ips} color="text-blue-400" />
            <MiniStat label="IP đích" value={s.unique_dest_ips} color="text-orange-400" />
            <MiniStat label="Giao thức" value={s.unique_protocols} color="text-indigo-400" />
            <MiniStat label="Dịch vụ" value={s.unique_services} color="text-teal-400" />
          </div>
        </section>

        <section className="glass-card p-6"><SectionHeader icon="◌" title="Traffic volume" subtitle="Bytes, packets và duration trên toàn bộ flow đã lọc" /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric label="Source bytes" value={data.traffic.source_bytes} /><Metric label="Destination bytes" value={data.traffic.dest_bytes} /><Metric label="Source packets" value={data.traffic.source_packets} /><Metric label="Destination packets" value={data.traffic.dest_packets} /><Metric label="Median duration" value={formatDuration(data.traffic.median_duration)} /><Metric label="Max duration" value={formatDuration(data.traffic.max_duration)} /></div></section>

        {/* ===== ATTACK BY CATEGORY ===== */}
        <section id="attack-category" className="scroll-mt-20">
          <div className="glass-card p-6">
            <SectionHeader icon="🛡️" title="Phân bố theo loại tấn công" subtitle="Số lượng bản ghi cho mỗi danh mục tấn công" />
            <AttackByCategoryChart data={data.attack_by_category} />
          </div>
        </section>

        {/* ===== TIMELINE ===== */}
        <section id="timeline" className="scroll-mt-20">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><div className="glass-card p-6"><SectionHeader icon="📅" title="Lưu lượng theo ngày" subtitle="Normal và attack theo date key" /><AttackByDateChart data={data.attack_by_date} /></div><div className="glass-card p-6"><SectionHeader icon="◌" title="Bytes theo ngày" subtitle="Tổng source/destination bytes, đơn vị MB" /><BytesTimelineChart data={data.attack_by_date} /></div></div>
        </section>

        {/* ===== HOURLY ===== */}
        <section id="hourly" className="scroll-mt-20">
          <div className="glass-card p-6">
            <SectionHeader icon="🕐" title="Phân bố theo giờ trong ngày" subtitle="Tần suất lưu lượng mạng qua 24 giờ" />
            <AttackByHourChart data={data.attack_by_hour} />
          </div>
        </section>

        {/* ===== PROTOCOL & SERVICE ===== */}
        <section id="protocol-service" className="scroll-mt-20">
          <SectionHeader icon="📡" title="Giao thức & Dịch vụ mạng" subtitle="Phân bố top giao thức và dịch vụ mạng" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Top giao thức
              </h3>
              <ProtocolChart data={data.protocol_distribution} />
            </div>
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                Top dịch vụ
              </h3>
              <ServiceChart data={data.service_distribution} />
            </div>
          </div>
        </section>

        <section className="glass-card p-6"><SectionHeader icon="⌁" title="Port range profile" subtitle="Phân loại source/destination port: non-port, well-known, registered và dynamic" /><PortRangeChart data={data.ports} /></section>

        <section className="glass-card p-6"><SectionHeader icon="◷" title="Duration distribution" subtitle="Phân bố flow theo độ dài phiên và số flow attack" /><DurationChart data={data.durations} /></section>

        {/* ===== ATTACK BY PROTOCOL ===== */}
        <section id="attack-protocol" className="scroll-mt-20">
          <div className="glass-card p-6">
            <SectionHeader icon="⚔️" title="Loại tấn công theo giao thức" subtitle="Ma trận giữa danh mục tấn công và giao thức mạng sử dụng" />
            <AttackByProtocolChart data={data.attack_category_by_protocol} />
          </div>
        </section>

        {/* ===== TOP IPs ===== */}
        <section id="top-ips" className="scroll-mt-20">
          <SectionHeader icon="🌐" title="Top địa chỉ IP" subtitle="Các IP nguồn thực hiện tấn công nhiều nhất và IP đích bị nhắm tới nhiều nhất" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Top 10 IP nguồn tấn công
              </h3>
              <TopIPsTable data={data.top_source_ips} label="IP Nguồn" />
            </div>
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                Top 10 IP bị tấn công
              </h3>
              <TopIPsTable data={data.top_dest_ips} label="IP Đích" />
            </div>
          </div>
        </section>

        {/* ===== DATA TABLE ===== */}
        <section id="data-table" className="scroll-mt-20">
          <div className="glass-card p-6">
            <SectionHeader icon="📋" title="Tra cứu flow" subtitle="Dữ liệu được lọc và phân trang tại backend" />
            <SampleTable
              data={data.sample_records}
              pagination={data.flow_pagination}
              page={page}
              onPageChange={onPageChange}
              onSearch={onSearch}
            />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12 py-6 text-center">
        <p className="text-xs text-slate-600">UNSW-NB15 Data Warehouse Dashboard — Team Project 2025</p>
        <p className="text-[10px] text-slate-700 mt-1">Built with React + Vite + TailwindCSS + Recharts</p>
      </footer>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="glass-card px-4 py-3 flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value.toLocaleString()}</span>
    </div>
  )
}

function Metric({ label, value }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-200">{value === null || value === undefined ? '—' : typeof value === 'string' ? value : Number(value).toLocaleString()}</p></div>
}

function formatDuration(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(4)} s`
}
