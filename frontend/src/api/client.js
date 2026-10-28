import axios from 'axios'
import { API_BASE_URL } from '../config'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: 'application/json' },
})

export async function apiGet(path, params = {}) {
  const { data } = await apiClient.get(path, { params })
  return data
}
