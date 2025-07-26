import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import { parseEther, formatEther } from 'viem'
import { publicClient, CONTRACT_ADDRESSES } from '../src/config/viem'
import { supabase } from '../src/config/supabase'

// Import ABIs
import mentoTokenBrokerAbi from '../src/abis/MentoTokenBroker.json'
import biPoolManagerAbi from '../src/abis/BiPoolManager.json'
import erc20Abi from '../src/abis/ERC20.json'

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

async function discoverTradingPairs(): Promise<TradingPairData[]> {
  console.log('🔍 Discovering trading pairs from BiPoolManager...')
  
  const tradingPairs: TradingPairData[] = []

  try {
    const exchanges = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.BI_POOL_MANAGER,
      abi: biPoolManagerAbi,
      functionName: 'getExchanges',
    }) as any[]

    console.log(`Found ${exchanges.length} exchanges`)

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
          console.log(`  ✅ Found pair: ${baseSymbol}/${quoteSymbol} (${exchange.exchangeId})`);
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

async function storeTradingPairs(tradingPairs: TradingPairData[]) {
  console.log('💾 Storing trading pairs in database...')

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
    } else {
      console.log(`  ✅ Stored pair: ${pair.pair}`)
    }
  }
}

async function main() {
  console.log('🚀 Starting trading pairs population...')
  
  try {
    // Check if contracts are accessible
    console.log('📋 Contract addresses:')
    console.log(`  MENTO_TOKEN_BROKER: ${CONTRACT_ADDRESSES.MENTO_TOKEN_BROKER}`)
    console.log(`  BI_POOL_MANAGER: ${CONTRACT_ADDRESSES.BI_POOL_MANAGER}`)
    
    // Discover trading pairs from blockchain
    const tradingPairs = await discoverTradingPairs()
    
    if (tradingPairs.length === 0) {
      console.log('❌ No trading pairs found')
      return
    }
    
    console.log(`\n📊 Found ${tradingPairs.length} trading pairs:`)
    tradingPairs.forEach(pair => {
      console.log(`  - ${pair.pair} (${pair.tokenInSymbol}/${pair.tokenOutSymbol})`)
    })
    
    // Store in database
    await storeTradingPairs(tradingPairs)
    
    console.log('\n✅ Trading pairs population completed!')
    
    // Verify in database
    const { data: storedPairs, error } = await supabase
      .from('trading_pairs')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      console.error('Error fetching stored pairs:', error)
    } else {
      console.log(`\n📋 Stored ${storedPairs?.length || 0} pairs in database:`)
      storedPairs?.forEach(pair => {
        console.log(`  - ${pair.pair} (${pair.token_in_symbol}/${pair.token_out_symbol})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error during trading pairs population:', error)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => {
    console.log('🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }) 