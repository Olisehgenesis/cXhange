import { useQuery } from 'react-query'
import { getLatestPrices, getPriceHistory, getTradingPairs, getMarketStats } from '../utils/api'

// Hook for latest prices
export const useLatestPrices = (pair?: string, limit: number = 100) => {
  return useQuery(
    ['latestPrices', pair, limit],
    () => getLatestPrices(pair, limit),
    {
      refetchInterval: 5000, // Refetch every 5 seconds
      staleTime: 2000,
    }
  )
}

// Hook for price history
export const usePriceHistory = (pair: string, limit: number = 100, before?: string) => {
  return useQuery(
    ['priceHistory', pair, limit, before],
    () => getPriceHistory(pair, limit, before),
    {
      refetchInterval: 10000, // Refetch every 10 seconds
      staleTime: 5000,
    }
  )
}



// Hook for trading pairs
export const useTradingPairs = () => {
  return useQuery(
    ['tradingPairs'],
    getTradingPairs,
    {
      refetchInterval: 60000, // Refetch every minute
      staleTime: 30000,
      retry: 2,
      retryDelay: 2000,
      refetchOnWindowFocus: false,
    }
  )
}



// Hook for market stats
export const useMarketStats = () => {
  return useQuery(
    ['marketStats'],
    getMarketStats,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 15000,
    }
  )
} 