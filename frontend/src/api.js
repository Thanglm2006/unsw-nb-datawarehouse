const API_BASE = import.meta.env.VITE_API_BASE || ''

async function get(path, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  })
  const response = await fetch(`${API_BASE}${path}${query.toString() ? `?${query}` : ''}`)
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}

export async function loadDashboard(filters, page, search) {
  const common = {
    start_date: filters.start_date,
    end_date: filters.end_date,
    protocol: filters.protocol,
    attack_category: filters.attack_category,
  }
  const flowParams = {
    ...common,
    protocol: filters.protocol,
    attack_category: filters.attack_category,
    q: search,
    limit: 50,
    offset: page * 50,
  }

  const [summary, attacks, dates, hours, protocols, services, sourceIps, destIps, attackProtocols, flows] = await Promise.all([
    get('/api/v1/metrics/overview', common),
    get('/api/v1/attacks/distribution', common),
    get('/api/v1/traffic/timeseries', common),
    get('/api/v1/traffic/hourly', common),
    get('/api/v1/distributions/protocols', common),
    get('/api/v1/distributions/services', common),
    get('/api/v1/ips/source', common),
    get('/api/v1/ips/destination', common),
    get('/api/v1/attacks/by-protocol', common),
    get('/api/v1/flows/search', flowParams),
  ])

  return {
    summary: {
      ...summary,
      attack_categories: attacks.map(item => item.category),
    },
    attack_by_category: attacks,
    attack_by_date: dates,
    attack_by_hour: hours.map(item => ({ ...item, label: `${String(item.hour).padStart(2, '0')}:00` })),
    protocol_distribution: protocols,
    service_distribution: services,
    top_source_ips: sourceIps,
    top_dest_ips: destIps,
    attack_category_by_protocol: attackProtocols,
    sample_records: flows.items.map(row => ({ ...row, Label: row.label })),
    flow_pagination: flows,
  }
}

export function loadFilters() {
  return get('/api/v1/filters')
}
