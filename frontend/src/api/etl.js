import { apiGet } from './client'

export function getEtlStatus() {
  return apiGet('/api/v1/etl/status')
}

export function getEtlRuns(limit = 20) {
  return apiGet('/api/v1/etl/runs', { limit })
}
