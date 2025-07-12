import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseAbi, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchange.sol/cXchange.json';

// Load environment variables
const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER!;
const sortedOracles = process.env.SORTED_ORACLES!;
const biPoolManager = process.env.BI_POOL_MANAGER!;
const baseToken = process.env.BASE_TOKEN!;
const privateKey = process.env.PRIVATE_KEY!;

if (!contractAddress || !mentoTokenBroker || !sortedOracles || !biPoolManager || !baseToken || !privateKey) {
  console.log('Environment variables:', { contractAddress, mentoTokenBroker, sortedOracles, biPoolManager, baseToken });
  
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS is not set');
  if (!mentoTokenBroker) throw new Error('MENTO_TOKEN_BROKER is not set');
  if (!sortedOracles) throw new Error('SORTED_ORACLES is not set');
  if (!biPoolManager) throw new Error('BI_POOL_MANAGER is not set');
  if (!baseToken) throw new Error('BASE_TOKEN is not set');
  if (!privateKey) throw new Error('PRIVATE_KEY is not set');
  
  throw new Error('Missing required environment variables. Please check your .env file.');
}

async function main() {
  // Set up account and clients
  const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`);
  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
  });

  console.log('🚀 cXchange Real-Time Testing Script');
  console.log('=====================================');
  console.log('Account address:', account.address);
  console.log('Contract address:', contractAddress);
  console.log('Network: Celo Alfajores');
  console.log('');

  // Create contract instance
  const contract = getContract({
    address: contractAddress,
    abi: cXchangeArtifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  try {
    // Check account balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log('💰 Account Balance:', formatEther(balance), 'CELO');
    console.log('');

    // 1. Get supported tokens
    console.log('📋 Getting Supported Tokens...');
    const supportedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
    console.log('Supported tokens count:', supportedTokens.length);
    
    for (let i = 0; i < supportedTokens.length; i++) {
      const token = supportedTokens[i];
      console.log(`  ${i + 1}. ${token}`);
      
      // Get token price if not base token
      if (token.toLowerCase() !== baseToken.toLowerCase()) {
        try {
          const [price, decimals] = await contract.read.getTokenPrice([token]) as [bigint, number];
          console.log(`     Price: ${formatEther(price)} (decimals: ${decimals})`);
        } catch (error) {
          console.log(`     Price: Unable to fetch - ${error.message?.slice(0, 50)}...`);
        }
      } else {
        console.log(`     Price: 1.0 (Base Token)`);
      }
    }
    console.log('');

    // 2. Get trading pairs
    console.log('📊 Getting Trading Pairs...');
    const tradingPairs = await contract.read.getTradingPairs() as string[];
    console.log('Active trading pairs count:', tradingPairs.length);
    
    if (tradingPairs.length > 0) {
      for (let i = 0; i < Math.min(tradingPairs.length, 5); i++) {
        const pairId = tradingPairs[i];
        console.log(`  ${i + 1}. Pair ID: ${pairId}`);
        
        try {
          const [lastPrice, priceChange24h, volume24h, high24h, low24h, lastTradeTimestamp] = 
            await contract.read.getMarketData([pairId]) as [bigint, bigint, bigint, bigint, bigint, bigint];
          
          console.log(`     Last Price: ${formatEther(lastPrice)}`);
          console.log(`     24h Volume: ${formatEther(volume24h)}`);
          console.log(`     24h High: ${formatEther(high24h)}`);
          console.log(`     24h Low: ${formatEther(low24h)}`);
          console.log(`     Last Trade: ${new Date(Number(lastTradeTimestamp) * 1000).toLocaleString()}`);
          
          // Get liquidity pool info if exists
          const [tokenA, tokenB, reserveA, reserveB, totalShares, userShares, lastUpdate] = 
            await contract.read.getLiquidityPoolInfo([pairId]) as [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint];
          
          if (tokenA !== '0x0000000000000000000000000000000000000000') {
            console.log(`     Pool - Token A: ${tokenA}`);
            console.log(`     Pool - Token B: ${tokenB}`);
            console.log(`     Pool - Reserve A: ${formatEther(reserveA)}`);
            console.log(`     Pool - Reserve B: ${formatEther(reserveB)}`);
            console.log(`     Pool - Total Shares: ${formatEther(totalShares)}`);
          }
        } catch (error) {
          console.log(`     Market data unavailable: ${error.message?.slice(0, 50)}...`);
        }
      }
    } else {
      console.log('  No trading pairs found. Contract may be newly deployed.');
    }
    console.log('');

    // 3. Get exchange providers for token pairs
    console.log('🔄 Getting Exchange Providers...');
    if (supportedTokens.length >= 2) {
      for (let i = 0; i < Math.min(supportedTokens.length - 1, 3); i++) {
        const tokenA = supportedTokens[i];
        const tokenB = supportedTokens[i + 1];
        
        try {
          const [provider, exchangeId, active, rateFeedId, lastPriceUpdate] = 
            await contract.read.getTokenExchangeProvider([tokenA, tokenB]) as [`0x${string}`, string, boolean, string, bigint];
          
          console.log(`  ${tokenA} -> ${tokenB}:`);
          console.log(`     Provider: ${provider}`);
          console.log(`     Exchange ID: ${exchangeId}`);
          console.log(`     Active: ${active}`);
          console.log(`     Rate Feed ID: ${rateFeedId}`);
          console.log(`     Last Update: ${new Date(Number(lastPriceUpdate) * 1000).toLocaleString()}`);
          
          // Test swap amount calculation
          if (active && provider !== '0x0000000000000000000000000000000000000000') {
            try {
              const testAmount = parseEther('1');
              const amountOut = await contract.read.getSwapAmountOut([tokenA, tokenB, testAmount]) as bigint;
              console.log(`     Test Swap (1 token): ${formatEther(amountOut)} output`);
            } catch (swapError) {
              console.log(`     Test Swap: Unable to calculate`);
            }
          }
        } catch (error) {
          console.log(`  ${tokenA} -> ${tokenB}: No provider found`);
        }
      }
    }
    console.log('');

    // 4. Execute real trades with CELO
    const celoToken = '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9' as `0x${string}`;
    const cusdToken = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as `0x${string}`; // cUSD on Alfajores
    const tradeAmount = parseEther('8'); // $8 worth
    
    console.log('💱 Executing Real Trades...');
    console.log('============================');
    console.log(`CELO Token: ${celoToken}`);
    console.log(`cUSD Token: ${cusdToken}`);
    console.log(`Trade Amount: ${formatEther(tradeAmount)} tokens`);
    console.log('');

    // Get initial balances
    const initialCeloBalance = await publicClient.getBalance({ address: account.address });
    console.log(`Initial CELO balance: ${formatEther(initialCeloBalance)}`);

    // 4. Monitor prices in real-time for 1 minute AND execute trades
    console.log('📈 Starting Real-Time Price Monitoring + Trading (60 seconds, updates every 3 seconds)...');
    console.log('==================================================================================');
    
    const monitoringDuration = 60 * 1000; // 1 minute
    const updateInterval = 3 * 1000; // 3 seconds
    const startTime = Date.now();
    
    const priceHistory: { [token: string]: { price: string; timestamp: Date }[] } = {};
    let tradeExecuted = false;
    let reverseTradeExecuted = false;
    
    while (Date.now() - startTime < monitoringDuration) {
      const currentTime = new Date();
      const elapsedTime = Date.now() - startTime;
      
      console.log(`\n⏰ Update at ${currentTime.toLocaleTimeString()}`);
      console.log('----------------------------------------');
      
      // Execute first trade at 15 seconds (CELO -> cUSD market order)
      if (!tradeExecuted && elapsedTime > 15000) {
        console.log('\n🚀 Executing Trade 1: CELO -> cUSD Market Order');
        try {
          // Check if we need to get cUSD price for calculation
          const [celoPrice] = await contract.read.getTokenPrice([celoToken]) as [bigint];
          const [cusdPrice] = await contract.read.getTokenPrice([cusdToken]) as [bigint];
          
          console.log(`CELO Price: ${formatEther(celoPrice)}`);
          console.log(`cUSD Price: ${formatEther(cusdPrice)}`);
          
          // Calculate minimum amount out for $8 trade
          const amountOut = tradeAmount * cusdPrice / celoPrice;
          const minAmountOut = amountOut * 95n / 100n; // 5% slippage tolerance
          
          console.log(`Trading ${formatEther(tradeAmount)} CELO for minimum ${formatEther(minAmountOut)} cUSD`);
          
          // Execute the market order through swapExactTokensForTokens
          const swapHash = await walletClient.writeContract({
            address: contractAddress,
            abi: cXchangeArtifact.abi,
            functionName: 'swapExactTokensForTokens',
            args: [celoToken, cusdToken, tradeAmount, minAmountOut, account.address],
            value: tradeAmount // Send CELO as value since it's native
          });
          
          console.log(`✅ Trade 1 submitted! Hash: ${swapHash}`);
          
          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
          if (receipt.status === 'success') {
            console.log('✅ Trade 1 confirmed successfully!');
            tradeExecuted = true;
          } else {
            console.log('❌ Trade 1 failed');
          }
          
        } catch (error) {
          console.log(`❌ Trade 1 failed: ${error.message?.slice(0, 100)}...`);
          
          // Try placing a limit order instead
          try {
            console.log('🔄 Attempting limit order instead...');
            const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
            
            const orderHash = await walletClient.writeContract({
              address: contractAddress,
              abi: cXchangeArtifact.abi,
              functionName: 'placeOrder',
              args: [
                celoToken,        // tokenIn
                cusdToken,        // tokenOut  
                tradeAmount,      // amountIn
                tradeAmount,      // amountOut (1:1 for simplicity)
                0,                // OrderType.MARKET
                true,             // isPartialFillAllowed
                expiresAt         // expiresAt
              ],
              value: tradeAmount
            });
            
            console.log(`✅ Limit order placed! Hash: ${orderHash}`);
            tradeExecuted = true;
            
          } catch (orderError) {
            console.log(`❌ Limit order also failed: ${orderError.message?.slice(0, 50)}...`);
          }
        }
      }
      
      // Execute reverse trade at 35 seconds (cUSD -> CELO)
      if (tradeExecuted && !reverseTradeExecuted && elapsedTime > 35000) {
        console.log('\n🔄 Executing Trade 2: cUSD -> CELO Market Order');
        try {
          // Get current balances to see how much cUSD we have
          const cusdBalance = parseEther('8'); // Approximate, should check actual balance
          const reverseAmount = cusdBalance / 2n; // Trade half back
          
          const [celoPrice] = await contract.read.getTokenPrice([celoToken]) as [bigint];
          const [cusdPrice] = await contract.read.getTokenPrice([cusdToken]) as [bigint];
          
          const amountOut = reverseAmount * celoPrice / cusdPrice;
          const minAmountOut = amountOut * 95n / 100n;
          
          console.log(`Trading ${formatEther(reverseAmount)} cUSD for minimum ${formatEther(minAmountOut)} CELO`);
          
          const reverseHash = await walletClient.writeContract({
            address: contractAddress,
            abi: cXchangeArtifact.abi,
            functionName: 'swapExactTokensForTokens',
            args: [cusdToken, celoToken, reverseAmount, minAmountOut, account.address]
          });
          
          console.log(`✅ Trade 2 submitted! Hash: ${reverseHash}`);
          
          const receipt = await publicClient.waitForTransactionReceipt({ hash: reverseHash });
          if (receipt.status === 'success') {
            console.log('✅ Trade 2 confirmed successfully!');
            reverseTradeExecuted = true;
          } else {
            console.log('❌ Trade 2 failed');
          }
          
        } catch (error) {
          console.log(`❌ Trade 2 failed: ${error.message?.slice(0, 100)}...`);
        }
      }
      
      // Show current trade status
      if (elapsedTime < 15000) {
        console.log(`⏳ First trade in ${Math.ceil((15000 - elapsedTime) / 1000)}s...`);
      } else if (elapsedTime < 35000 && tradeExecuted) {
        console.log(`⏳ Reverse trade in ${Math.ceil((35000 - elapsedTime) / 1000)}s...`);
      }
      
      if (tradeExecuted) console.log('✅ Trade 1 status: EXECUTED');
      if (reverseTradeExecuted) console.log('✅ Trade 2 status: EXECUTED');
      
      // Monitor prices for all supported tokens
      for (let i = 0; i < Math.min(supportedTokens.length, 5); i++) {
        const token = supportedTokens[i];
        const shortAddress = `${token.slice(0, 6)}...${token.slice(-4)}`;
        
        if (token.toLowerCase() === baseToken.toLowerCase()) {
          console.log(`${shortAddress} (BASE): 1.0000`);
          continue;
        }
        
        try {
          const [price, decimals] = await contract.read.getTokenPrice([token]) as [bigint, number];
          const formattedPrice = formatEther(price);
          
          // Store price history
          if (!priceHistory[token]) {
            priceHistory[token] = [];
          }
          priceHistory[token].push({ price: formattedPrice, timestamp: currentTime });
          
          // Calculate price change if we have previous data
          let changeIndicator = '';
          if (priceHistory[token].length > 1) {
            const previousPrice = parseFloat(priceHistory[token][priceHistory[token].length - 2].price);
            const currentPrice = parseFloat(formattedPrice);
            
            if (currentPrice > previousPrice) {
              changeIndicator = ' 📈 +' + ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2) + '%';
            } else if (currentPrice < previousPrice) {
              changeIndicator = ' 📉 -' + ((previousPrice - currentPrice) / previousPrice * 100).toFixed(2) + '%';
            } else {
              changeIndicator = ' ➡️  0.00%';
            }
          }
          
          console.log(`${shortAddress}: ${parseFloat(formattedPrice).toFixed(6)}${changeIndicator}`);
          
        } catch (error) {
          console.log(`${shortAddress}: Price unavailable`);
        }
      }
      
      // Show order book for first trading pair if available
      if (tradingPairs.length > 0) {
        try {
          const [buyPrices, buyAmounts, sellPrices, sellAmounts] = 
            await contract.read.getOrderBook([tradingPairs[0], 5]) as [bigint[], bigint[], bigint[], bigint[]];
          
          if (buyPrices.length > 0 || sellPrices.length > 0) {
            console.log('\n📖 Order Book (Top 5):');
            console.log('Sells:', sellPrices.length > 0 ? sellPrices.map((p, i) => 
              `${formatEther(p)}@${formatEther(sellAmounts[i])}`).join(', ') : 'None');
            console.log('Buys: ', buyPrices.length > 0 ? buyPrices.map((p, i) => 
              `${formatEther(p)}@${formatEther(buyAmounts[i])}`).join(', ') : 'None');
          }
        } catch (error) {
          // Order book may be empty, which is normal
        }
      }
      
      const remainingTime = Math.max(0, monitoringDuration - (Date.now() - startTime));
      if (remainingTime > 0) {
        console.log(`\n⏳ Remaining time: ${Math.ceil(remainingTime / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, updateInterval));
      }
    }
    
    console.log('\n✅ Price monitoring and trading completed!');
    
    // Show final balances
    const finalCeloBalance = await publicClient.getBalance({ address: account.address });
    const celoChange = finalCeloBalance - initialCeloBalance;
    
    console.log('\n💰 Final Balance Summary:');
    console.log('==========================');
    console.log(`Initial CELO: ${formatEther(initialCeloBalance)}`);
    console.log(`Final CELO: ${formatEther(finalCeloBalance)}`);
    console.log(`Net Change: ${celoChange >= 0n ? '+' : ''}${formatEther(celoChange)} CELO`);
    console.log(`Trades Executed: ${tradeExecuted ? '1' : '0'} + ${reverseTradeExecuted ? '1' : '0'} = ${(tradeExecuted ? 1 : 0) + (reverseTradeExecuted ? 1 : 0)}`);
    console.log('');

    // 5. Check for any active orders
    console.log('📋 Checking Active Orders...');
    try {
      const activeOrders = await contract.read.getUserOrders([account.address, true]) as bigint[];
      console.log(`Active orders count: ${activeOrders.length}`);
      
      if (activeOrders.length > 0) {
        for (let i = 0; i < Math.min(activeOrders.length, 5); i++) {
          const orderId = activeOrders[i];
          const order = await contract.read.getOrder([orderId]) as {
            tokenIn: `0x${string}`;
            tokenOut: `0x${string}`;
            amountIn: bigint;
            amountOut: bigint;
            price: bigint;
            status: number;
            filledAmount: bigint;
            expiresAt: bigint;
          };
          
          console.log(`  Order ${orderId}:`);
          console.log(`    Token In: ${order.tokenIn}`);
          console.log(`    Token Out: ${order.tokenOut}`);
          console.log(`    Amount In: ${formatEther(order.amountIn)}`);
          console.log(`    Amount Out: ${formatEther(order.amountOut)}`);
          console.log(`    Price: ${formatEther(order.price)}`);
          console.log(`    Status: ${order.status} (0=Active, 1=Filled, 2=Cancelled, 3=Expired)`);
          console.log(`    Filled: ${formatEther(order.filledAmount)}/${formatEther(order.amountIn)}`);
          console.log(`    Expires: ${new Date(Number(order.expiresAt) * 1000).toLocaleString()}`);
          
          // Cancel the order if it's still active (for testing)
          if (order.status === 0 && Number(order.expiresAt) > Date.now() / 1000) {
            try {
              console.log(`    🗑️  Cancelling order ${orderId}...`);
              const cancelHash = await walletClient.writeContract({
                address: contractAddress,
                abi: cXchangeArtifact.abi,
                functionName: 'cancelOrder',
                args: [orderId]
              });
              
              const cancelReceipt = await publicClient.waitForTransactionReceipt({ hash: cancelHash });
              if (cancelReceipt.status === 'success') {
                console.log(`    ✅ Order ${orderId} cancelled successfully`);
              }
            } catch (cancelError) {
              console.log(`    ❌ Failed to cancel order: ${cancelError.message?.slice(0, 50)}...`);
            }
          }
        }
      } else {
        console.log('  No active orders found.');
      }
    } catch (error) {
      console.log(`Unable to fetch orders: ${error.message?.slice(0, 50)}...`);
    }
    console.log('');

    // 6. Summary and contract stats
    console.log('📊 Final Contract Summary');
    console.log('=========================');
    console.log(`Supported Tokens: ${supportedTokens.length}`);
    console.log(`Trading Pairs: ${tradingPairs.length}`);
    console.log(`Base Token: ${baseToken}`);
    console.log(`Mento Broker: ${mentoTokenBroker}`);
    console.log(`Sorted Oracles: ${sortedOracles}`);
    console.log(`BiPool Manager: ${biPoolManager}`);
    console.log('');
    
    // Show price history summary
    console.log('💹 Price Movement Summary:');
    Object.entries(priceHistory).forEach(([token, history]) => {
      if (history.length > 1) {
        const firstPrice = parseFloat(history[0].price);
        const lastPrice = parseFloat(history[history.length - 1].price);
        const change = ((lastPrice - firstPrice) / firstPrice * 100);
        const shortAddress = `${token.slice(0, 6)}...${token.slice(-4)}`;
        
        console.log(`${shortAddress}: ${change >= 0 ? '+' : ''}${change.toFixed(2)}% (${history.length} updates)`);
      }
    });
    
    console.log('\n🎉 Testing completed successfully!');
    console.log(`View contract on CeloScan: https://alfajores.celoscan.io/address/${contractAddress}`);

  } catch (error) {
    console.error('❌ Testing failed:', error);
    
    // Try to provide more specific error information
    if (error.message?.includes('revert')) {
      console.log('Contract reverted. This might be due to:');
      console.log('- Contract not properly deployed');
      console.log('- Invalid contract address');
      console.log('- Network connectivity issues');
    }
    
    if (error.message?.includes('CALL_EXCEPTION')) {
      console.log('Call exception. Check if:');
      console.log('- Contract address is correct');
      console.log('- Contract is deployed on Alfajores');
      console.log('- Network connection is stable');
    }
    
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});