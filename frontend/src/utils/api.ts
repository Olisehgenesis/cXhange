import axios from 'axios'
import { Price, Candle, TradingPair, MarketStats } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Price endpoints
export const getLatestPrices = async (pair?: string, limit: number = 100): Promise<Price[]> => {
  const params = new URLSearchParams()
  if (pair) params.append('pair', pair)
  params.append('limit', limit.toString())
  
  const response = await api.get(`/api/prices/latest?${params}`)
  return response.data.prices
}

export const getPriceHistory = async (pair: string, limit: number = 100): Promise<Price[]> => {
  const response = await api.get(`/api/prices/${pair}/history?limit=${limit}`)
  return response.data.prices
}

// Candle endpoints
export const getCandles = async (
  pair: string, 
  timeframe: string = '1h', 
  limit: number = 100
): Promise<Candle[]> => {
  const response = await api.get(`/api/candles/${pair}?timeframe=${timeframe}&limit=${limit}`)
  return response.data.candles
}

// Trading pairs endpoints
export const getTradingPairs = async (): Promise<TradingPair[]> => {
  const response = await api.get('/api/pairs')
  return response.data.pairs
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