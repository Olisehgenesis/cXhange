import { parseEther, formatEther } from 'viem'
import { publicClient, CONTRACT_ADDRESSES } from '../config/viem'
import { supabase } from '../config/supabase'

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

// Helper: identify CELO and cUSD by symbol (add at top of file)
const CELO_SYMBOLS = ['CELO'];
const STABLE_SYMBOLS = ['cUSD', 'cUSDC', 'USDC', 'cUSDT', 'USDT'];

export class TradingPairsService {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private readonly UPDATE_INTERVAL = 0 // No automatic updates

  async start() {
    if (this.isRunning) {
      console.log('🔄 Trading pairs service is already running')
      return
    }

    console.log('🚀 Starting trading pairs service...')
    this.isRunning = true

    // Only do initial update, no periodic updates
    await this.updateTradingPairs()

    console.log('✅ Trading pairs service completed initial update')
  }

  stop() {
    if (!this.isRunning) {
      console.log('🔄 Trading pairs service is not running')
      return
    }

    console.log('🛑 Stopping trading pairs service...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('✅ Trading pairs service stopped')
  }

  private async discoverTradingPairs(): Promise<TradingPairData[]> {
    const tradingPairs: TradingPairData[] = []

    try {
      const exchanges = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.BI_POOL_MANAGER,
        abi: biPoolManagerAbi,
        functionName: 'getExchanges',
      }) as any[]

      for (const exchange of exchanges) {
        if (exchange.assets.length === 2) {
          const [tokenA, tokenB] = exchange.assets;
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
            ]);

            // Enforce CELO as tokenIn and cUSD (or other stable) as tokenOut
            let baseSymbol = symbolA as string;
            let quoteSymbol = symbolB as string;
            let baseToken = tokenA;
            let quoteToken = tokenB;
            if (
              (STABLE_SYMBOLS.includes(baseSymbol) && CELO_SYMBOLS.includes(quoteSymbol)) ||
              (STABLE_SYMBOLS.includes(baseSymbol) && !STABLE_SYMBOLS.includes(quoteSymbol))
            ) {
              // Swap so that stable is always tokenOut
              baseSymbol = symbolB as string;
              quoteSymbol = symbolA as string;
              baseToken = tokenB;
              quoteToken = tokenA;
            }
            const pairData: TradingPairData = {
              pair: `${baseSymbol}_${quoteSymbol}`,
              tokenIn: baseToken,
              tokenOut: quoteToken,
              tokenInSymbol: baseSymbol,
              tokenOutSymbol: quoteSymbol,
              exchangeId: exchange.exchangeId
            };
            tradingPairs.push(pairData);
          } catch (error) {
            console.log(`  ❌ Failed to get symbols for pair: ${tokenA}/${tokenB}`);
          }
        }
      }
    } catch (error) {
      console.error('Error discovering trading pairs:', error)
      throw error
    }

    return tradingPairs
  }

  private async storeTradingPairs(tradingPairs: TradingPairData[]) {
    for (const pair of tradingPairs) {
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

  private async updateTradingPairs() {
    try {
      const timestamp = new Date().toISOString()
      console.log(`🔄 Updating trading pairs at ${timestamp}`)

      // Discover trading pairs from blockchain
      const tradingPairs = await this.discoverTradingPairs()
      
      if (tradingPairs.length === 0) {
        console.log('⚠️  No trading pairs found in contract')
        return
      }

      // Store in database
      await this.storeTradingPairs(tradingPairs)

      console.log(`✅ Updated ${tradingPairs.length} trading pairs`)

    } catch (error) {
      console.error('❌ Error updating trading pairs:', error)
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning
  }

  getUpdateInterval(): number {
    return this.UPDATE_INTERVAL
  }
} 