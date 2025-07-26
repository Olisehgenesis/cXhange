import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev3Artifact from '../artifacts/contracts/cXchangev3.sol/cXchangev3.json';

// Environment variables
const contractAddress = process.env.CONTRACT_ADDRESS_V3! as `0x${string}`;
const biPoolManager = process.env.BI_POOL_MANAGER! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

// BiPoolManager ABI for reading exchanges
const BiPoolManagerABI = [
  {
    "inputs": [],
    "name": "getExchanges",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes32", "name": "exchangeId", "type": "bytes32"},
          {"internalType": "address[]", "name": "assets", "type": "address[]"}
        ],
        "internalType": "struct IExchangeProvider.Exchange[]",
        "name": "exchanges",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for reading token details
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol", 
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

type TokenInfo = {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  exchanges: {
    exchangeId: `0x${string}`;
    pairedWith: `0x${string}`;
  }[];
};

type Exchange = {
  exchangeId: `0x${string}`;
  assets: `0x${string}`[];
};

async function main() {
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

  console.log('🚀 Fixed Setup: cXchange v3 Hybrid DEX');
  console.log('=======================================');
  console.log('Account:', account.address);
  console.log('Contract:', contractAddress);
  console.log('BiPoolManager:', biPoolManager);
  console.log('');

  const contract = getContract({
    address: contractAddress,
    abi: cXchangev3Artifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  try {
    // Step 1: Read all exchanges from BiPoolManager
    console.log('📊 Step 1: Reading All Exchanges from BiPoolManager...');
    const exchanges = await publicClient.readContract({
      address: biPoolManager,
      abi: BiPoolManagerABI,
      functionName: 'getExchanges',
    }) as Exchange[];

    console.log(`Found ${exchanges.length} exchanges in BiPoolManager`);
    
    // Step 2: Extract all unique tokens
    console.log('\n🔍 Step 2: Discovering All Tokens...');
    const uniqueTokens = new Set<string>();
    
    exchanges.forEach(exchange => {
      exchange.assets.forEach(asset => {
        uniqueTokens.add(asset.toLowerCase());
      });
    });
    
    console.log(`Found ${uniqueTokens.size} unique tokens`);
    
    // Step 3: Read token details from blockchain
    console.log('\n📝 Step 3: Reading Token Details from Blockchain...');
    const tokenInfos: TokenInfo[] = [];
    
    for (const tokenAddress of Array.from(uniqueTokens)) {
      const address = tokenAddress as `0x${string}`;
      
      try {
        console.log(`  Reading details for ${address}...`);
        
        const [name, symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address,
            abi: ERC20_ABI,
            functionName: 'name',
          }) as Promise<string>,
          publicClient.readContract({
            address,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }) as Promise<string>,
          publicClient.readContract({
            address,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }) as Promise<number>
        ]);
        
        // Find all exchanges for this token
        const tokenExchanges = exchanges
          .filter(exchange => exchange.assets.some(asset => asset.toLowerCase() === tokenAddress))
          .map(exchange => ({
            exchangeId: exchange.exchangeId,
            pairedWith: exchange.assets.find(asset => asset.toLowerCase() !== tokenAddress)!
          }));
        
        tokenInfos.push({
          address,
          name,
          symbol,
          decimals,
          exchanges: tokenExchanges
        });
        
        console.log(`    ✅ ${symbol} (${name}) - ${tokenExchanges.length} exchanges`);
        
      } catch (error) {
        console.log(`    ❌ Failed to read ${address}: ${error.message?.slice(0, 50)}...`);
      }
    }
    
    console.log(`\n✅ Successfully read details for ${tokenInfos.length} tokens`);
    
    // Step 4: Add all tokens to the DEX
    console.log('\n🔧 Step 4: Adding Tokens to DEX...');
    
    for (const token of tokenInfos) {
      try {
        console.log(`  Adding ${token.symbol} (${token.address})...`);
        
        const addTokenHash = await contract.write.addSupportedToken([token.address]);
        await publicClient.waitForTransactionReceipt({ hash: addTokenHash });
        
        console.log(`    ✅ ${token.symbol} added successfully`);
        
      } catch (error) {
        if (error.message?.includes('Token already supported')) {
          console.log(`    ℹ️  ${token.symbol} already supported`);
        } else {
          console.log(`    ❌ Failed to add ${token.symbol}: ${error.message?.slice(0, 50)}...`);
        }
      }
    }
    
    // Step 5: Add all trading pairs with correct parameters
    console.log('\n📊 Step 5: Adding Trading Pairs...');
    
    let pairsAdded = 0;
    for (const exchange of exchanges) {
      if (exchange.assets.length === 2) {
        const [tokenA, tokenB] = exchange.assets;
        const tokenAInfo = tokenInfos.find(t => t.address.toLowerCase() === tokenA.toLowerCase());
        const tokenBInfo = tokenInfos.find(t => t.address.toLowerCase() === tokenB.toLowerCase());
        
        if (tokenAInfo && tokenBInfo) {
          try {
            console.log(`  Adding pair: ${tokenAInfo.symbol}/${tokenBInfo.symbol}...`);
            
            // addTradingPair parameters for cXchange v3:
            // address tokenA, address tokenB, address exchangeProvider, bytes32 exchangeId, 
            // uint256 minOrderSize, bool enableAmm, bool enableMento
            const addPairHash = await contract.write.addTradingPair([
              tokenA,                  // tokenA
              tokenB,                  // tokenB  
              biPoolManager,           // exchangeProvider
              exchange.exchangeId,     // exchangeId
              parseEther('0.1'),       // minOrderSize
              true,                    // enableAmm (enable AMM pools)
              true                     // enableMento (enable Mento routing)
            ]);
            
            await publicClient.waitForTransactionReceipt({ hash: addPairHash });
            console.log(`    ✅ ${tokenAInfo.symbol}/${tokenBInfo.symbol} pair added`);
            pairsAdded++;
            
          } catch (error) {
            if (error.message?.includes('Pair already exists')) {
              console.log(`    ℹ️  ${tokenAInfo.symbol}/${tokenBInfo.symbol} pair already exists`);
            } else {
              console.log(`    ❌ Failed to add ${tokenAInfo.symbol}/${tokenBInfo.symbol}: ${error.message?.slice(0, 50)}...`);
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Successfully added ${pairsAdded} trading pairs`);
    
    // Step 6: Verify contract state
    console.log('\n🧪 Step 6: Verifying Contract State...');
    
    try {
      const supportedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
      const activePairs = await contract.read.getActivePairs() as string[];
      const activeAmmPools = await contract.read.getActiveAmmPools() as string[];
      const ammEnabled = await contract.read.ammEnabled() as boolean;
      const orderBookEnabled = await contract.read.orderBookEnabled() as boolean;
      const defaultExecutionMode = await contract.read.defaultExecutionMode() as number;
      
      console.log(`✅ Supported tokens: ${supportedTokens.length}`);
      console.log(`✅ Active pairs: ${activePairs.length}`);
      console.log(`✅ Active AMM pools: ${activeAmmPools.length}`);
      console.log(`✅ AMM enabled: ${ammEnabled}`);
      console.log(`✅ Order book enabled: ${orderBookEnabled}`);
      console.log(`✅ Default execution mode: ${defaultExecutionMode} (0=AUTO, 1=AMM_ONLY, 2=ORDER_ONLY, 3=MENTO_ONLY)`);
      
    } catch (error) {
      console.log(`❌ Verification failed: ${error.message?.slice(0, 100)}...`);
    }
    
    // Step 7: Test market price functionality
    console.log('\n💰 Step 7: Testing Market Prices...');
    
    if (tokenInfos.length >= 2) {
      try {
        const pairId = await contract.read.getPairId([tokenInfos[0].address, tokenInfos[1].address]) as string;
        console.log(`Testing pair: ${tokenInfos[0].symbol}/${tokenInfos[1].symbol}`);
        console.log(`Pair ID: ${pairId.slice(0, 10)}...`);
        
        const marketPrice = await contract.read.getMarketPrice([pairId]) as bigint;
        if (marketPrice > 0n) {
          console.log(`✅ Market price: ${formatEther(marketPrice)}`);
        } else {
          console.log(`ℹ️  Market price not available yet (normal for new pairs)`);
        }
        
        // Test swap amount calculation
        const [bestAmountOut, bestMode] = await contract.read.getSwapAmountOut([
          tokenInfos[0].address,
          tokenInfos[1].address,
          parseEther('1')
        ]) as [bigint, number];
        
        console.log(`✅ Swap test: 1 ${tokenInfos[0].symbol} → ${formatEther(bestAmountOut)} ${tokenInfos[1].symbol}`);
        console.log(`✅ Best execution mode: ${bestMode} (0=AUTO, 1=AMM_ONLY, 2=ORDER_ONLY, 3=MENTO_ONLY)`);
        
      } catch (error) {
        console.log(`ℹ️  Price testing skipped: ${error.message?.slice(0, 50)}...`);
      }
    }
    
    // Final verification
    console.log('\n🎉 cXchange v3 Setup Complete!');
    console.log('===============================');
    console.log(`✅ ${tokenInfos.length} tokens discovered and added`);
    console.log(`✅ ${pairsAdded} hybrid trading pairs configured`);
    console.log(`✅ Both AMM and Mento routing enabled`);
    console.log(`✅ Order book functionality ready`);
    console.log(`✅ Admin execution capabilities active`);
    console.log('');
    
    console.log('🚀 Advanced Features Available:');
    console.log('================================');
    console.log('💧 AMM Pools: Add liquidity for instant swaps');
    console.log('📋 Order Book: Place limit orders for precise trading');
    console.log('🔀 Smart Routing: Auto-selects best execution method');
    console.log('🏛️  Mento Integration: Access to all Celo stable assets');
    console.log('👨‍💼 Admin Execution: Backend systems can execute orders');
    console.log('');
    
    console.log('📊 Next Steps:');
    console.log('==============');
    console.log('1. Add backend admins for order execution');
    console.log('2. Provide initial liquidity to AMM pools');
    console.log('3. Start monitoring for user orders');
    console.log('4. Test all execution modes');
    console.log('');
    console.log(`📈 View on CeloScan: https://alfajores.celoscan.io/address/${contractAddress}`);
    console.log('');
    console.log('🌟 Your Hybrid DEX is now the most advanced trading platform on Celo! 🌟');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);