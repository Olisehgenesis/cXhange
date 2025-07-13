import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import { supabase } from '../config/supabase'
import { Candle } from '../types/database'

interface CandleData {
  pair: string
  timeframe: string
  open_price: string
  high_price: string
  low_price: string
  close_price: string
  volume: string
  trades: number
  timestamp: string
}

export class CandleGenerator {
  private timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
  private isRunning = false

  async generateCandles() {
    console.log('🕯️  Generating candles...')

    for (const timeframe of this.timeframes) {
      await this.generateCandlesForTimeframe(timeframe)
    }
  }

  async generateCandlesForTimeframe(timeframe: string) {
    const interval = this.getIntervalMinutes(timeframe)
    const now = new Date()
    const candleTime = new Date(
      Math.floor(now.getTime() / (interval * 60 * 1000)) * (interval * 60 * 1000)
    )

    // Get unique pairs
    const { data: pairs, error: pairsError } = await supabase
      .from('trading_pairs')
      .select('pair')
      .eq('is_active', true)

    if (pairsError || !pairs) {
      console.error('Error fetching trading pairs:', pairsError)
      return
    }

    for (const { pair } of pairs) {
      await this.generateCandleForPair(pair, timeframe, candleTime, interval)
    }
  }

  async generateCandleForPair(pair: string, timeframe: string, candleTime: Date, intervalMinutes: number) {
    const startTime = new Date(candleTime.getTime() - intervalMinutes * 60 * 1000)
    const endTime = candleTime

    // Get price data for this time period
    const { data: prices, error } = await supabase
      .from('prices')
      .select('price, timestamp')
      .eq('pair', pair)
      .gte('timestamp', startTime.toISOString())
      .lt('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: true })

    if (error || !prices || prices.length === 0) {
      return // No data for this period
    }

    // Calculate OHLC
    const priceValues = prices.map(p => parseFloat(p.price))
    const open = priceValues[0]
    const close = priceValues[priceValues.length - 1]
    const high = Math.max(...priceValues)
    const low = Math.min(...priceValues)
    const volume = 0 // Would need trade data for actual volume
    const trades = prices.length

    const candleData: CandleData = {
      pair,
      timeframe,
      open_price: open.toString(),
      high_price: high.toString(),
      low_price: low.toString(),
      close_price: close.toString(),
      volume: volume.toString(),
      trades,
      timestamp: candleTime.toISOString()
    }

    // Upsert candle
    const { error: insertError } = await supabase
      .from('candles')
      .upsert(candleData, {
        onConflict: 'pair,timeframe,timestamp'
      })

    if (insertError) {
      console.error(`Error inserting candle for ${pair} ${timeframe}:`, insertError)
    } else {
      console.log(`✅ Generated ${timeframe} candle for ${pair}`)
    }
  }

  getIntervalMinutes(timeframe: string): number {
    switch (timeframe) {
      case '1m': return 1
      case '5m': return 5
      case '15m': return 15
      case '1h': return 60
      case '4h': return 240
      case '1d': return 1440
      default: return 1
    }
  }

  async start() {
    if (this.isRunning) return

    this.isRunning = true
    const interval = parseInt(process.env.CANDLE_GENERATION_INTERVAL || '60000')
    console.log(`🔄 Starting candle generation (${interval}ms intervals)...`)

    while (this.isRunning) {
      try {
        await this.generateCandles()
        await new Promise(resolve => setTimeout(resolve, interval))
      } catch (error) {
        console.error('Error generating candles:', error)
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }
  }

  stop() {
    this.isRunning = false
    console.log('⏹️  Candle generator stopped')
  }

  getTimeframes(): string[] {
    return this.timeframes
  }
} 