import axios from 'axios'
import { Price, TradingPair, MarketStats } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

console.log('[API] Using API_BASE_URL:', API_BASE_URL)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Add request interceptor for debugging
api.interceptors.request.use((config) => {
  console.log('[API] Making request to:', config.url, 'Full URL:', (config.baseURL || '') + (config.url || ''))
  return config
})

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response from:', response.config.url, 'Status:', response.status)
    return response
  },
  (error) => {
    console.error('[API] Error from:', error.config?.url, 'Error:', error.message)
    return Promise.reject(error)
  }
)

// Price endpoints
export const getLatestPrices = async (pair?: string, limit: number = 100): Promise<Price[]> => {
  const params = new URLSearchParams()
  if (pair) params.append('pair', pair)
  params.append('limit', limit.toString())
  
  const response = await api.get(`/api/prices/latest?${params}`)
  return response.data.prices || []
}

export const getPriceHistory = async (pair: string, limit: number = 100): Promise<Price[]> => {
  const response = await api.get(`/api/prices/${pair}/history?limit=${limit}`)
  return response.data.prices || []
}



// Trading pairs endpoints
export const getTradingPairs = async (): Promise<TradingPair[]> => {
  const response = await api.get('/api/pairs')
  return response.data.pairs || []
}



// Market stats
export const getMarketStats = async (): Promise<MarketStats> => {
  const response = await api.get('/api/market/stats')
  return response.data
}

// Health check
export const getHealth = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await api.get('/health')
  return response.data
} 