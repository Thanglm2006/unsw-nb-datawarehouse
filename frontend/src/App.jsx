import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import './index.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    async function loadData() {
      try {
        const files = [
          'summary', 'attack_by_category', 'attack_by_date', 'attack_by_hour',
          'protocol_distribution', 'service_distribution',
          'top_source_ips', 'top_dest_ips', 'attack_category_by_protocol',
          'sample_records'
        ]
        const results = {}
        for (const file of files) {
          const res = await fetch(`/data/${file}.json`)
          results[file] = await res.json()
        }
        setData(results)
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['overview', 'attack-category', 'timeline', 'hourly', 'protocol-service', 'attack-protocol', 'top-ips', 'data-table']
      for (const id of sections.reverse()) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(id)
          break
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin"></div>
          </div>
          <p className="text-slate-400 text-lg font-medium">Đang tải dữ liệu...</p>
          <p className="text-slate-600 text-sm mt-1">Phân tích 2.5M+ bản ghi mạng</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-slate-400">Không tìm thấy file JSON trong <code className="text-cyan-400">public/data/</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      {/* Left Sidebar */}
      <Sidebar activeSection={activeSection} data={data.summary} />

      {/* Main Content */}
      <div className="flex-1 pl-56">
        <Dashboard data={data} />
      </div>
    </div>
  )
}

export default App
