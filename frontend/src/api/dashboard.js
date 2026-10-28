import { apiGet } from './client'

export function loadFilters() {
  return apiGet('/api/v1/filters')
}

export async function loadDashboard(filters, page, search) {
  const common = {
    start_date: filters.start_date,
    end_date: filters.end_date,
    protocol: filters.protocol,
    attack_category: filters.attack_category,
  }
  const flowParams = { ...common, q: search, limit: 50, offset: page * 50 }
  const [summary, attacks, dates, hours, protocols, services, sourceIps, destIps, attackProtocols, flows, traffic, ports, durations] = await Promise.all([
    apiGet('/api/v1/metrics/overview', common),
    apiGet('/api/v1/attacks/distribution', common),
    apiGet('/api/v1/traffic/timeseries', common),
    apiGet('/api/v1/traffic/hourly', common),
    apiGet('/api/v1/distributions/protocols', common),
    apiGet('/api/v1/distributions/services', common),
    apiGet('/api/v1/ips/source', common),
    apiGet('/api/v1/ips/destination', common),
    apiGet('/api/v1/attacks/by-protocol', common),
    apiGet('/api/v1/flows/search', flowParams),
    apiGet('/api/v1/metrics/traffic', common),
    apiGet('/api/v1/metrics/ports', common),
    apiGet('/api/v1/metrics/duration-buckets', common),
  ])

  return {
    summary: { ...summary, attack_categories: attacks.map(item => item.category) },
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
    traffic,
    ports,
    durations,
  }
}
