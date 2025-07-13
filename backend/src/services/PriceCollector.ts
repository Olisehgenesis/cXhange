import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import { parseEther, formatEther } from 'viem'
import { publicClient, CONTRACT_ADDRESSES } from '../config/viem'
import { supabase } from '../config/supabase'
import { Price, TradingPair } from '../types/database'

// Import ABIs
import mentoTokenBrokerAbi from '../abis/MentoTokenBroker.json'
import biPoolManagerAbi from '../abis/BiPoolManager.json'
import erc20Abi from '../abis/ERC20.json'

interface TradingPairData {
  pair: string
  tokenIn: string
  tokenOut: string
  tokenInSymbol: string
  tokenOutSymbol: string
  exchangeId: string
}

export class PriceCollector {
  private tradingPairs: TradingPairData[] = []
  private isRunning = false

  async initialize() {
    console.log('🚀 Initializing Price Collector...')

    // Load trading pairs from database instead of discovering from contract
    await this.loadTradingPairsFromDatabase()

    console.log(`✅ Initialized with ${this.tradingPairs.length} trading pairs`)
  }

  async discoverTradingPairs() {
    console.log('🔍 Discovering trading pairs from BiPoolManager...')

    try {
      const exchanges = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.BI_POOL_MANAGER,
        abi: biPoolManagerAbi,
        functionName: 'getExchanges',
      }) as any[]

      for (const exchange of exchanges) {
        if (exchange.assets.length === 2) {
          const [tokenA, tokenB] = exchange.assets

          try {
            const [symbolA, symbolB] = await Promise.all([
              publicClient.readContract({
                address: tokenA,
                abi: erc20Abi,
                functionName: 'symbol',
              }),
              publicClient.readContract({
                address: tokenB,
                abi: erc20Abi,
                functionName: 'symbol',
              })
            ])

            this.tradingPairs.push({
              pair: `${symbolA}_${symbolB}`,
              tokenIn: tokenA,
              tokenOut: tokenB,
              tokenInSymbol: symbolA as string,
              tokenOutSymbol: symbolB as string,
              exchangeId: exchange.exchangeId
            })

            console.log(`  ✅ Found pair: ${symbolA}/${symbolB}`)

          } catch (error) {
            console.log(`  ❌ Failed to get symbols for pair: ${tokenA}/${tokenB}`)
          }
        }
      }
    } catch (error) {
      console.error('Error discovering trading pairs:', error)
      throw error
    }
  }

  async loadTradingPairsFromDatabase() {
    console.log('📥 Loading trading pairs from database...')

    const { data, error } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error loading trading pairs from database:', error)
      throw error
    }

    this.tradingPairs = data.map(pair => ({
      pair: pair.pair,
      tokenIn: pair.token_in,
      tokenOut: pair.token_out,
      tokenInSymbol: pair.token_in_symbol,
      tokenOutSymbol: pair.token_out_symbol,
      exchangeId: pair.exchange_id
    }))

    console.log(`✅ Loaded ${this.tradingPairs.length} trading pairs from database`)
  }

  async storeTradingPairs() {
    console.log('💾 Storing trading pairs in database...')

    for (const pair of this.tradingPairs) {
      const { error } = await supabase
        .from('trading_pairs')
        .upsert({
          pair: pair.pair,
          token_in: pair.tokenIn,
          token_out: pair.tokenOut,
          token_in_symbol: pair.tokenInSymbol,
          token_out_symbol: pair.tokenOutSymbol,
          exchange_id: pair.exchangeId,
          is_active: true
        }, {
          onConflict: 'pair'
        })

      if (error) {
        console.error(`Error storing pair ${pair.pair}:`, error)
      }
    }
  }

  async collectPrices() {
    const timestamp = new Date().toISOString()
    const blockNumber = await publicClient.getBlockNumber()

    console.log(`📊 Collecting prices at ${timestamp} (Block: ${blockNumber})`)

    const pricePromises = this.tradingPairs.map(async (pair) => {
      try {
        const amountOut = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.MENTO_TOKEN_BROKER,
          abi: mentoTokenBrokerAbi,
          functionName: 'getAmountOut',
          args: [
            CONTRACT_ADDRESSES.BI_POOL_MANAGER,
            pair.exchangeId,
            pair.tokenIn,
            pair.tokenOut,
            parseEther('1')
          ]
        }) as bigint

        const price = parseFloat(formatEther(amountOut))
        const inversePrice = price > 0 ? 1 / price : 0

        return {
          pair: pair.pair,
          token_in: pair.tokenIn,
          token_out: pair.tokenOut,
          token_in_symbol: pair.tokenInSymbol,
          token_out_symbol: pair.tokenOutSymbol,
          price: price.toString(),
          inverse_price: inversePrice.toString(),
          volume_24h: '0',
          source: 'MENTO',
          timestamp,
          block_number: Number(blockNumber)
        }

      } catch (error) {
        // Handle "no valid median" errors gracefully - this means the pair doesn't have enough liquidity
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('no valid median')) {
          console.log(`⚠️  No valid median for ${pair.pair} - skipping`)
          return null
        }
        console.error(`Error getting price for ${pair.pair}:`, error)
        return null
      }
    })

    const prices = (await Promise.all(pricePromises)).filter(p => p !== null) as Price[]

    if (prices.length > 0) {
      // Insert prices
      const { error: priceError } = await supabase
        .from('prices')
        .insert(prices)

      if (priceError) {
        console.error('Error inserting prices:', priceError)
      } else {
        console.log(`✅ Inserted ${prices.length} price records`)
      }

      // Price collection complete - candles are now generated dynamically on frontend
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Price collector is already running')
      return
    }

    this.isRunning = true
    const interval = parseInt(process.env.PRICE_COLLECTION_INTERVAL || '5000')
    console.log(`🔄 Starting price collection (${interval}ms intervals)...`)

    while (this.isRunning) {
      try {
        await this.collectPrices()
        await new Promise(resolve => setTimeout(resolve, interval))
      } catch (error) {
        console.error('Error in price collection:', error)
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }
  }

  stop() {
    this.isRunning = false
    console.log('⏹️  Price collector stopped')
  }

  getTradingPairs(): TradingPairData[] {
    return this.tradingPairs
  }
} 