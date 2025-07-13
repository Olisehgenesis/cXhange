import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { supabase } from './config/supabase'
import { PriceCollector } from './services/PriceCollector'
import { CandleGenerator } from './services/CandleGenerator'
import { TradingPairsService } from './services/TradingPairsService'

const app: Application = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  return res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Get latest prices
app.get('/api/prices/latest', async (req, res) => {
  try {
    const { pair, limit = '100' } = req.query

    let query = supabase
      .from('prices')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit as string))

    if (pair) {
      query = query.eq('pair', pair)
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ prices: data })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get candles for a specific pair
app.get('/api/candles/:pair', async (req, res) => {
  try {
    const { pair } = req.params
    const { timeframe = '1h', limit = '100' } = req.query

    const { data, error } = await supabase
      .from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit as string))

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ candles: data })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all trading pairs
app.get('/api/pairs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('is_active', true)
      .order('pair')

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ pairs: data })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get price history for a pair
app.get('/api/prices/:pair/history', async (req, res) => {
  try {
    const { pair } = req.params
    const { timeframe = '1h', limit = '100' } = req.query

    let query = supabase
      .from('prices')
      .select('*')
      .eq('pair', pair)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit as string))

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ prices: data })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get market statistics
app.get('/api/market/stats', async (req, res) => {
  try {
    const { data: pairs, error: pairsError } = await supabase
      .from('trading_pairs')
      .select('pair')
      .eq('is_active', true)

    if (pairsError) {
      return res.status(500).json({ error: pairsError.message })
    }

    const stats = {
      totalPairs: pairs?.length || 0,
      activePairs: pairs?.length || 0,
      lastUpdate: new Date().toISOString()
    }

    return res.json(stats)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Start price collection (admin endpoint)
app.post('/api/admin/start-price-collection', async (req, res) => {
  try {
    const collector = new PriceCollector()
    await collector.initialize()
    collector.start()
    
    return res.json({ message: 'Price collection started' })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to start price collection' })
  }
})

// Start candle generation (admin endpoint)
app.post('/api/admin/start-candle-generation', async (req, res) => {
  try {
    const generator = new CandleGenerator()
    generator.start()
    
    return res.json({ message: 'Candle generation started' })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to start candle generation' })
  }
})

// Trading pairs service status (admin endpoint)
app.get('/api/admin/trading-pairs-status', async (req, res) => {
  try {
    const tradingPairsService = new TradingPairsService()
    return res.json({ 
      isRunning: tradingPairsService.isServiceRunning(),
      updateInterval: tradingPairsService.getUpdateInterval()
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get trading pairs service status' })
  }
})

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something broke!' })
})

// 404 handler
app.use((req, res) => {
  return res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`📈 API docs: http://localhost:${PORT}/api`)
  
  // Start trading pairs service automatically
  try {
    const tradingPairsService = new TradingPairsService()
    await tradingPairsService.start()
    console.log('🔄 Trading pairs service started automatically')
  } catch (error) {
    console.error('❌ Failed to start trading pairs service:', error)
  }
})

export default app 