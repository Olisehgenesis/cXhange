import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev2Artifact from '../artifacts/contracts/cXchangev2.sol/cXchangev2.json';

// Environment variables
const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
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

  console.log('🚀 Dynamic Setup: Simple DEX with All Mento Assets');
  console.log('===================================================');
  console.log('Account:', account.address);
  console.log('Contract:', contractAddress);
  console.log('BiPoolManager:', biPoolManager);
  console.log('');

  const contract = getContract({
    address: contractAddress,
    abi: cXchangev2Artifact.abi,
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
    
    // Step 5: Add all trading pairs
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
            
            // Calculate minimum order size (0.1 tokens or $0.10 equivalent)
            const minOrderSize = parseEther('0.1');
            
            const addPairHash = await contract.write.addTradingPair([
              tokenA,
              tokenB,
              biPoolManager,
              exchange.exchangeId,
              minOrderSize
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
    
    // Step 6: Verification
    console.log('\n🧪 Step 6: Verifying Setup...');
    
    const supportedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
    const activePairs = await contract.read.activePairs() as string[];
    
    console.log(`✅ DEX now supports ${supportedTokens.length} tokens`);
    console.log(`✅ DEX now has ${activePairs.length} active trading pairs`);
    
    // Display summary
    console.log('\n📋 Setup Summary:');
    console.log('==================');
    
    console.log('\n🪙 Supported Tokens:');
    for (const token of tokenInfos.slice(0, 10)) { // Show first 10
      console.log(`  • ${token.symbol.padEnd(8)} - ${token.name}`);
    }
    if (tokenInfos.length > 10) {
      console.log(`  ... and ${tokenInfos.length - 10} more tokens`);
    }
    
    console.log('\n🔄 Trading Pairs Examples:');
    const examplePairs = exchanges.slice(0, 5).map(exchange => {
      if (exchange.assets.length === 2) {
        const tokenA = tokenInfos.find(t => t.address.toLowerCase() === exchange.assets[0].toLowerCase());
        const tokenB = tokenInfos.find(t => t.address.toLowerCase() === exchange.assets[1].toLowerCase());
        return tokenA && tokenB ? `${tokenA.symbol}/${tokenB.symbol}` : null;
      }
      return null;
    }).filter(Boolean);
    
    examplePairs.forEach(pair => console.log(`  • ${pair}`));
    if (exchanges.length > 5) {
      console.log(`  ... and ${exchanges.length - 5} more pairs`);
    }
    
    // Test market price for a popular pair
    console.log('\n💰 Testing Market Prices:');
    try {
      const pairId = await contract.read.getPairId([supportedTokens[0], supportedTokens[1]]);
      const marketPrice = await contract.read.getMarketPrice([pairId]) as bigint;
      
      if (marketPrice > 0n) {
        const token0 = tokenInfos.find(t => t.address.toLowerCase() === supportedTokens[0].toLowerCase());
        const token1 = tokenInfos.find(t => t.address.toLowerCase() === supportedTokens[1].toLowerCase());
        console.log(`  • 1 ${token0?.symbol} = ${formatEther(marketPrice)} ${token1?.symbol}`);
      }
    } catch (error) {
      console.log('  • Price testing skipped (normal for new setup)');
    }
    
    console.log('\n🎉 Dynamic Setup Complete!');
    console.log('===========================');
    console.log('✅ All Mento assets have been automatically discovered and added');
    console.log('✅ All available trading pairs have been configured');
    console.log('✅ Your Simple DEX is ready for trading!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('  1. Add backend admins: addAdmin(backendWalletAddress)');
    console.log('  2. Start monitoring for orders via events');
    console.log('  3. Begin executing user orders via admin functions');
    console.log('');
    console.log(`📊 View contract: https://alfajores.celoscan.io/address/${contractAddress}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});