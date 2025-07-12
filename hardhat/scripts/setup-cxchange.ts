import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseAbi, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchange.sol/cXchange.json';

// Load environment variables
const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER!;
const sortedOracles = process.env.SORTED_ORACLES!;
const biPoolManager = process.env.BI_POOL_MANAGER!;
const baseToken = process.env.BASE_TOKEN!; // cUSD
const privateKey = process.env.PRIVATE_KEY!;

// Mento Alfajores Token Addresses
const TOKENS = {
  CELO: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9' as `0x${string}`,
  cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as `0x${string}`, // Base token
  cEUR: '0x10c892A6EC43A53E45d0B916B4b7d383b1b78c0F' as `0x${string}`,
  cBRL: '0xe4D517785d091d3c54818832db6094bcc2744545' as `0x${string}`,
  USDC: '0x2c4b568dfba1fbdbb4e7dad3f4186b68bce40db3' as `0x${string}`, // Bridged USDC
};

// Rate Feed IDs for Mento Oracles (derived from token symbols)
const RATE_FEED_IDS = {
  CELO_USD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as `0x${string}`, // CELO/cUSD uses cUSD address
  EUR_USD: '0x10c892A6EC43A53E45d0B916B4b7d383b1b78c0F' as `0x${string}`, // EUR/USD uses cEUR address  
  BRL_USD: '0xe4D517785d091d3c54818832db6094bcc2744545' as `0x${string}`, // BRL/USD uses cBRL address
  USDC_USD: '0x2c4b568dfba1fbdbb4e7dad3f4186b68bce40db3' as `0x${string}`, // USDC/USD
};

// Exchange IDs from BiPoolManager (you can get these from getExchanges() call)
const EXCHANGE_IDS = {
  CELO_CUSD: '0x' + Buffer.from('CELO/cUSD').toString('hex').padEnd(64, '0') as `0x${string}`,
  CEUR_CUSD: '0x' + Buffer.from('cEUR/cUSD').toString('hex').padEnd(64, '0') as `0x${string}`,
  CBRL_CUSD: '0x' + Buffer.from('cBRL/cUSD').toString('hex').padEnd(64, '0') as `0x${string}`,
  USDC_CUSD: '0x' + Buffer.from('USDC/cUSD').toString('hex').padEnd(64, '0') as `0x${string}`,
};

if (!contractAddress || !privateKey) {
  throw new Error('Missing CONTRACT_ADDRESS or PRIVATE_KEY in environment variables');
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

  console.log('🔧 cXchange Setup & Configuration Script');
  console.log('=========================================');
  console.log('Account address:', account.address);
  console.log('Contract address:', contractAddress);
  console.log('Network: Celo Alfajores');
  console.log('');

  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('💰 Account Balance:', formatEther(balance), 'CELO');
  
  if (balance < parseEther('0.1')) {
    console.log('⚠️  Warning: Low balance, you may need more CELO for gas fees');
  }
  console.log('');

  // Step 1: Add supported tokens
  console.log('📝 Step 1: Adding Supported Tokens...');
  console.log('=====================================');
  
  const tokensToAdd = [
    {
      name: 'CELO',
      address: TOKENS.CELO,
      exchangeProvider: biPoolManager,
      exchangeId: EXCHANGE_IDS.CELO_CUSD,
      rateFeedId: RATE_FEED_IDS.CELO_USD
    },
    {
      name: 'cEUR', 
      address: TOKENS.cEUR,
      exchangeProvider: biPoolManager,
      exchangeId: EXCHANGE_IDS.CEUR_CUSD,
      rateFeedId: RATE_FEED_IDS.EUR_USD
    },
    {
      name: 'cBRL',
      address: TOKENS.cBRL,
      exchangeProvider: biPoolManager,
      exchangeId: EXCHANGE_IDS.CBRL_CUSD,
      rateFeedId: RATE_FEED_IDS.BRL_USD
    },
    {
      name: 'USDC',
      address: TOKENS.USDC,
      exchangeProvider: biPoolManager,
      exchangeId: EXCHANGE_IDS.USDC_CUSD,
      rateFeedId: RATE_FEED_IDS.USDC_USD
    }
  ];

  for (const token of tokensToAdd) {
    try {
      console.log(`Adding ${token.name} (${token.address})...`);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: cXchangeArtifact.abi,
        functionName: 'addSupportedToken',
        args: [token.address, token.exchangeProvider, token.exchangeId, token.rateFeedId],
      });
      
      console.log(`  Transaction hash: ${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'success') {
        console.log(`  ✅ ${token.name} added successfully!`);
      } else {
        console.log(`  ❌ ${token.name} addition failed`);
      }
      
    } catch (error) {
      if (error.message?.includes('Token already supported')) {
        console.log(`  ℹ️  ${token.name} already supported`);
      } else {
        console.log(`  ❌ Error adding ${token.name}: ${error.message?.slice(0, 100)}...`);
      }
    }
  }
  console.log('');

  // Step 2: Add trading pairs
  console.log('📊 Step 2: Adding Trading Pairs...');
  console.log('===================================');
  
  const tradingPairs = [
    {
      name: 'CELO/cUSD',
      tokenA: TOKENS.CELO,
      tokenB: TOKENS.cUSD,
      minOrderSize: parseEther('0.1'),
      tickSize: parseEther('0.001'),
      rateFeedId: RATE_FEED_IDS.CELO_USD
    },
    {
      name: 'cEUR/cUSD',
      tokenA: TOKENS.cEUR,
      tokenB: TOKENS.cUSD,
      minOrderSize: parseEther('0.1'),
      tickSize: parseEther('0.001'),
      rateFeedId: RATE_FEED_IDS.EUR_USD
    },
    {
      name: 'cBRL/cUSD',
      tokenA: TOKENS.cBRL,
      tokenB: TOKENS.cUSD,
      minOrderSize: parseEther('0.1'),
      tickSize: parseEther('0.001'),
      rateFeedId: RATE_FEED_IDS.BRL_USD
    },
    {
      name: 'USDC/cUSD',
      tokenA: TOKENS.USDC,
      tokenB: TOKENS.cUSD,
      minOrderSize: parseEther('0.1'),
      tickSize: parseEther('0.001'),
      rateFeedId: RATE_FEED_IDS.USDC_USD
    }
  ];

  for (const pair of tradingPairs) {
    try {
      console.log(`Adding ${pair.name} trading pair...`);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: cXchangeArtifact.abi,
        functionName: 'addTradingPair',
        args: [pair.tokenA, pair.tokenB, pair.minOrderSize, pair.tickSize, pair.rateFeedId],
      });
      
      console.log(`  Transaction hash: ${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'success') {
        console.log(`  ✅ ${pair.name} pair added successfully!`);
      } else {
        console.log(`  ❌ ${pair.name} pair addition failed`);
      }
      
    } catch (error) {
      if (error.message?.includes('Pair already exists')) {
        console.log(`  ℹ️  ${pair.name} pair already exists`);
      } else {
        console.log(`  ❌ Error adding ${pair.name}: ${error.message?.slice(0, 100)}...`);
      }
    }
  }
  console.log('');

  // Step 3: Verify setup
  console.log('✅ Step 3: Verifying Setup...');
  console.log('==============================');
  
  try {
    // Check supported tokens
    const supportedTokens = await publicClient.readContract({
      address: contractAddress,
      abi: cXchangeArtifact.abi,
      functionName: 'getSupportedTokens',
    });
    
    console.log(`Supported tokens count: ${supportedTokens.length}`);
    for (let i = 0; i < supportedTokens.length; i++) {
      const token = supportedTokens[i];
      const tokenName = Object.entries(TOKENS).find(([, addr]) => addr.toLowerCase() === token.toLowerCase())?.[0] || 'Unknown';
      console.log(`  ${i + 1}. ${tokenName}: ${token}`);
    }
    console.log('');
    
    // Check trading pairs
    const tradingPairs = await publicClient.readContract({
      address: contractAddress,
      abi: cXchangeArtifact.abi,
      functionName: 'getTradingPairs',
    });
    
    console.log(`Trading pairs count: ${tradingPairs.length}`);
    console.log('');
    
    // Test price fetching for CELO
    console.log('🧪 Testing Price Fetching...');
    try {
      const [celoPrice, decimals] = await publicClient.readContract({
        address: contractAddress,
        abi: cXchangeArtifact.abi,
        functionName: 'getTokenPrice',
        args: [TOKENS.CELO],
      });
      
      console.log(`✅ CELO Price: ${formatEther(celoPrice)} (decimals: ${decimals})`);
    } catch (priceError) {
      console.log(`❌ CELO Price fetch failed: ${priceError.message?.slice(0, 100)}...`);
      console.log('💡 This might be normal if oracles haven\'t reported prices yet');
    }
    
    // Test swap amount calculation
    try {
      const swapAmount = await publicClient.readContract({
        address: contractAddress,
        abi: cXchangeArtifact.abi,
        functionName: 'getSwapAmountOut',
        args: [TOKENS.CELO, TOKENS.cUSD, parseEther('1')],
      });
      
      console.log(`✅ 1 CELO → ${formatEther(swapAmount)} cUSD (estimated)`);
    } catch (swapError) {
      console.log(`❌ Swap calculation failed: ${swapError.message?.slice(0, 100)}...`);
    }
    
  } catch (error) {
    console.log(`❌ Verification failed: ${error.message}`);
  }
  
  console.log('');
  console.log('🎉 Setup Complete!');
  console.log('==================');
  console.log('Your cXchange contract is now configured with:');
  console.log('- Multiple supported tokens (CELO, cEUR, cBRL, USDC, cUSD)');
  console.log('- Trading pairs for each token with cUSD');
  console.log('- Exchange providers pointing to Mento BiPoolManager');
  console.log('- Rate feed IDs for Mento oracles');
  console.log('');
  console.log('🚀 You can now run the trading test script:');
  console.log('   npx ts-node scripts/test-cxchange.ts');
  console.log('');
  console.log(`📊 View on CeloScan: https://alfajores.celoscan.io/address/${contractAddress}`);
}

main().catch((err) => {
  console.error('💥 Setup failed:', err);
  process.exit(1);
});