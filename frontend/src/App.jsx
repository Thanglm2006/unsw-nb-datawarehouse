import { useCallback, useEffect, useState } from 'react'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import ETLPage from './pages/ETLPage'
import ETLFlowPage from './pages/ETLFlowPage'
import SchemaDesignPage from './pages/SchemaDesignPage'
import DashboardQueryPage from './pages/DashboardQueryPage'
import './index.css'

function App() {
  const [page, setPage] = useState(() => window.location.hash.replace('#/', '') || 'dashboard')
  const navigate = useCallback(next => { window.location.hash = `/${next}`; setPage(next) }, [])
  useEffect(() => { const onHash = () => setPage(window.location.hash.replace('#/', '') || 'dashboard'); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])

  return (
    <AppShell page={page} onNavigate={navigate}>
      {page === 'etl' ? <ETLPage /> : page === 'etl-flow' ? <ETLFlowPage /> : page === 'schema' ? <SchemaDesignPage /> : page === 'query' ? <DashboardQueryPage /> : <DashboardPage />}
    </AppShell>
  )
}

export default App
