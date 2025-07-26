export interface Price {
  id: number
  pair: string
  token_in: string
  token_out: string
  token_in_symbol: string
  token_out_symbol: string
  price: string
  inverse_price: string
  volume_24h: string
  source: string
  timestamp: string
  block_number: number | null
  created_at: string
}

export interface Candle {
  id: number
  pair: string
  timeframe: string
  open_price: string
  high_price: string
  low_price: string
  close_price: string
  volume: string
  trades: number
  timestamp: string
  created_at: string
  updated_at: string
}

export interface LiveCandle {
  pair: string
  timeframe: string
  open_price: string
  high_price: string
  low_price: string
  close_price: string
  volume: string
  trades: number
  timestamp: string
  is_live: boolean
  last_update: string
}

export interface TradingPair {
  id: number
  pair: string
  token_in: string
  token_out: string
  token_in_symbol: string
  token_out_symbol: string
  exchange_id: string
  is_active: boolean
  created_at: string
}

export interface MarketStats {
  totalPairs: number
  activePairs: number
  lastUpdate: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
} 