import { Price } from '../types/api'

export interface DynamicCandle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  trades: number
  isLive: boolean
}

export interface TimeframeConfig {
  seconds: number
  label: string
}

export const TIMEFRAMES: Record<string, TimeframeConfig> = {
  '1m': { seconds: 60, label: '1m' },
  '5m': { seconds: 300, label: '5m' },
  '15m': { seconds: 900, label: '15m' },
  '1h': { seconds: 3600, label: '1h' },
  '4h': { seconds: 14400, label: '4h' },
  '1d': { seconds: 86400, label: '1d' },
}

export class DynamicCandlestickGenerator {
  private priceCache: Map<string, Price[]> = new Map()
  private candleCache: Map<string, DynamicCandle[]> = new Map()

  // Add new price data
  addPrice(pair: string, price: Price) {
    if (!this.priceCache.has(pair)) {
      this.priceCache.set(pair, [])
    }
    
    const prices = this.priceCache.get(pair)!
    prices.push(price)
    
    // Keep only last 1000 prices to prevent memory issues
    if (prices.length > 1000) {
      prices.splice(0, prices.length - 1000)
    }
    
    // Clear candle cache to force regeneration
    this.candleCache.delete(pair)
  }

  // Get prices for a specific pair
  getPrices(pair: string): Price[] {
    return this.priceCache.get(pair) || []
  }

  // Generate candles for a specific timeframe
  generateCandles(pair: string, timeframe: string, limit: number = 100): DynamicCandle[] {
    const cacheKey = `${pair}_${timeframe}`
    
    // Check cache first
    if (this.candleCache.has(cacheKey)) {
      const cached = this.candleCache.get(cacheKey)!
      if (cached.length >= limit) {
        return cached.slice(-limit)
      }
    }

    const prices = this.getPrices(pair)
    if (prices.length === 0) {
      return []
    }

    const timeframeConfig = TIMEFRAMES[timeframe]
    if (!timeframeConfig) {
      console.error(`Unknown timeframe: ${timeframe}`)
      return []
    }

    const candles = this.generateCandlesFromPrices(prices, timeframeConfig.seconds, limit)
    
    // Cache the result
    this.candleCache.set(cacheKey, candles)
    
    return candles
  }

  // Generate live candle (current forming candle)
  generateLiveCandle(pair: string, timeframe: string): DynamicCandle | null {
    const prices = this.getPrices(pair)
    if (prices.length === 0) return null

    const timeframeConfig = TIMEFRAMES[timeframe]
    if (!timeframeConfig) return null

    const now = new Date()
    const currentPeriodStart = this.getPeriodStart(now, timeframeConfig.seconds)
    
    // Get prices for current period
    const currentPeriodPrices = prices.filter(price => {
      const priceTime = new Date(price.timestamp)
      return priceTime >= currentPeriodStart && priceTime <= now
    })

    if (currentPeriodPrices.length === 0) return null

    // Calculate OHLC for current period
    const priceValues = currentPeriodPrices.map(p => parseFloat(p.price))
    const open = priceValues[0]
    const close = priceValues[priceValues.length - 1]
    const high = Math.max(...priceValues)
    const low = Math.min(...priceValues)

    return {
      timestamp: currentPeriodStart.toISOString(),
      open,
      high,
      low,
      close,
      volume: 0, // Would need trade data for actual volume
      trades: currentPeriodPrices.length,
      isLive: true
    }
  }

  // Get all timeframes for a pair
  getAllTimeframes(pair: string): Record<string, DynamicCandle[]> {
    const result: Record<string, DynamicCandle[]> = {}
    
    Object.keys(TIMEFRAMES).forEach(timeframe => {
      result[timeframe] = this.generateCandles(pair, timeframe, 50)
    })
    
    return result
  }

  // Clear data for a pair
  clearPair(pair: string) {
    this.priceCache.delete(pair)
    // Clear all cached candles for this pair
    Object.keys(TIMEFRAMES).forEach(timeframe => {
      this.candleCache.delete(`${pair}_${timeframe}`)
    })
  }

  // Clear all data
  clearAll() {
    this.priceCache.clear()
    this.candleCache.clear()
  }

  // Private helper methods
  private generateCandlesFromPrices(prices: Price[], periodSeconds: number, limit: number): DynamicCandle[] {
    if (prices.length === 0) return []

    // Sort prices by timestamp
    const sortedPrices = [...prices].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const candles: DynamicCandle[] = []
    const now = new Date()
    
    // Generate candles for each period
    for (let i = 0; i < limit; i++) {
      const periodStart = new Date(now.getTime() - (limit - i - 1) * periodSeconds * 1000)
      const periodEnd = new Date(periodStart.getTime() + periodSeconds * 1000)
      
      // Get prices for this period
      const periodPrices = sortedPrices.filter(price => {
        const priceTime = new Date(price.timestamp)
        return priceTime >= periodStart && priceTime < periodEnd
      })

      if (periodPrices.length > 0) {
        const priceValues = periodPrices.map(p => parseFloat(p.price))
        const open = priceValues[0]
        const close = priceValues[priceValues.length - 1]
        const high = Math.max(...priceValues)
        const low = Math.min(...priceValues)

        candles.push({
          timestamp: periodStart.toISOString(),
          open,
          high,
          low,
          close,
          volume: 0,
          trades: periodPrices.length,
          isLive: false
        })
      }
    }

    return candles.filter(candle => candle !== null)
  }

  private getPeriodStart(date: Date, periodSeconds: number): Date {
    const timestamp = date.getTime()
    const periodStart = Math.floor(timestamp / (periodSeconds * 1000)) * (periodSeconds * 1000)
    return new Date(periodStart)
  }
}

// Global instance
export const candlestickGenerator = new DynamicCandlestickGenerator() 