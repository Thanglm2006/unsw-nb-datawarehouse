import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Dashboard from '../components/Dashboard'
import { loadDashboard, loadFilters } from '../api/dashboard'

const emptyFilters = { start_date: '', end_date: '', protocol: '', attack_category: '' }

export default function DashboardPage() {
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const filtersQuery = useQuery({ queryKey: ['filters'], queryFn: loadFilters })
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', filters, page, search],
    queryFn: () => loadDashboard(filters, page, search),
    placeholderData: keepPreviousData,
  })
  const data = dashboardQuery.data
  const options = filtersQuery.data || { protocols: [], attack_categories: [] }
  const loading = dashboardQuery.isLoading || filtersQuery.isLoading
  const error = dashboardQuery.error || filtersQuery.error

  if (loading && !data) return <PageState text="Đang tải dữ liệu warehouse..." />
  if (error && !data) return <PageState text={`Không tải được dashboard: ${error.message}`} error />

  return (
    <Dashboard
      data={data}
      filters={filters}
      options={options}
      onFiltersChange={next => { setFilters(next); setPage(0) }}
      onResetFilters={() => { setFilters(emptyFilters); setPage(0) }}
      onPageChange={setPage}
      onSearch={value => { setSearch(value); setPage(0) }}
      page={page}
    />
  )
}

function PageState({ text, error = false }) {
  return <div className="flex min-h-screen items-center justify-center p-8"><div className={`glass-card max-w-lg p-8 text-center ${error ? 'border-red-500/30' : ''}`}><div className="mb-3 text-3xl">{error ? '!' : '…'}</div><p className="text-sm text-slate-300">{text}</p></div></div>
}
