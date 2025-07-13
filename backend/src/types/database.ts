export interface Database {
  public: {
    Tables: {
      prices: {
        Row: {
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
        Insert: {
          pair: string
          token_in: string
          token_out: string
          token_in_symbol: string
          token_out_symbol: string
          price: string
          inverse_price: string
          volume_24h?: string
          source?: string
          timestamp?: string
          block_number?: number | null
        }
        Update: {
          pair?: string
          token_in?: string
          token_out?: string
          token_in_symbol?: string
          token_out_symbol?: string
          price?: string
          inverse_price?: string
          volume_24h?: string
          source?: string
          timestamp?: string
          block_number?: number | null
        }
      }
      candles: {
        Row: {
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
        Insert: {
          pair: string
          timeframe: string
          open_price: string
          high_price: string
          low_price: string
          close_price: string
          volume?: string
          trades?: number
          timestamp: string
        }
        Update: {
          pair?: string
          timeframe?: string
          open_price?: string
          high_price?: string
          low_price?: string
          close_price?: string
          volume?: string
          trades?: number
          timestamp?: string
          updated_at?: string
        }
      }
      trading_pairs: {
        Row: {
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
        Insert: {
          pair: string
          token_in: string
          token_out: string
          token_in_symbol: string
          token_out_symbol: string
          exchange_id: string
          is_active?: boolean
        }
        Update: {
          pair?: string
          token_in?: string
          token_out?: string
          token_in_symbol?: string
          token_out_symbol?: string
          exchange_id?: string
          is_active?: boolean
        }
      }
    }
  }
}

export type Price = Database['public']['Tables']['prices']['Row']
export type Candle = Database['public']['Tables']['candles']['Row']
export type TradingPair = Database['public']['Tables']['trading_pairs']['Row'] 