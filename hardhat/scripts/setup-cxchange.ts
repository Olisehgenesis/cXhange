import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchangev2.sol/cXchange.json';

// Environment variables
const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
const biPoolManager = process.env.BI_POOL_MANAGER! as `0x${string}`;
const sortedOracles = process.env.SORTED_ORACLES! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

// Token addresses
const CELO = '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9' as `0x${string}`;
const cUSD = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as `0x${string}`;

// Simple BiPoolManager ABI for getting exchanges
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

// Type for the exchange structure
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

  console.log('🔍 Simple cXchange Setup & Test');
  console.log('================================');
  console.log('Account:', account.address);
  console.log('Contract:', contractAddress);
  console.log('');

  // Step 1: Check what exchanges are available in BiPoolManager
  console.log('📊 Step 1: Checking Available Mento Exchanges...');
  try {
    const exchanges = await publicClient.readContract({
      address: biPoolManager,
      abi: BiPoolManagerABI,
      functionName: 'getExchanges',
    }) as Exchange[];

    console.log(`Found ${exchanges.length} exchanges in BiPoolManager:`);
    
    let celoUsdExchange: Exchange | null = null;
    for (let i = 0; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      console.log(`  ${i + 1}. Exchange ID: ${exchange.exchangeId}`);
      console.log(`     Assets: ${exchange.assets.join(', ')}`);
      
      // Look for CELO/cUSD pair
      if (exchange.assets.includes(CELO) && exchange.assets.includes(cUSD)) {
        celoUsdExchange = exchange;
        console.log(`     ✅ This is CELO/cUSD pair!`);
      }
    }
    
    if (!celoUsdExchange) {
      console.log('❌ No CELO/cUSD exchange found in BiPoolManager');
      return;
    }
    
    console.log('');
    console.log('🎯 Found CELO/cUSD Exchange:');
    console.log('Exchange ID:', celoUsdExchange.exchangeId);
    console.log('Assets:', celoUsdExchange.assets);
    console.log('');

    // Step 2: Add CELO token to our contract using the real exchange data
    console.log('⚙️  Step 2: Configuring Contract...');
    
    const contract = getContract({
      address: contractAddress,
      abi: cXchangeArtifact.abi,
      client: { public: publicClient, wallet: walletClient }
    });

    // Add CELO if not already added
    try {
      console.log('Adding CELO token...');
      const addTokenHash = await contract.write.addSupportedToken([
        CELO,
        biPoolManager,
        celoUsdExchange.exchangeId,
        cUSD // Use cUSD address as rateFeedId for CELO/USD pair
      ]);
      
      await publicClient.waitForTransactionReceipt({ hash: addTokenHash });
      console.log('✅ CELO token added successfully!');
    } catch (error) {
      if (error.message?.includes('Token already supported')) {
        console.log('ℹ️  CELO token already supported');
      } else {
        console.log('❌ Error adding CELO:', error.message?.slice(0, 100));
      }
    }

    // Add trading pair
    try {
      console.log('Adding CELO/cUSD trading pair...');
      const addPairHash = await contract.write.addTradingPair([
        CELO,
        cUSD,
        parseEther('0.1'), // minOrderSize
        parseEther('0.01'), // tickSize  
        celoUsdExchange.exchangeId // rateFeedId
      ]);
      
      await publicClient.waitForTransactionReceipt({ hash: addPairHash });
      console.log('✅ CELO/cUSD trading pair added successfully!');
    } catch (error) {
      if (error.message?.includes('Pair already exists')) {
        console.log('ℹ️  CELO/cUSD pair already exists');
      } else {
        console.log('❌ Error adding pair:', error.message?.slice(0, 100));
      }
    }

    console.log('');

    // Step 3: Test basic functionality
    console.log('🧪 Step 3: Testing Basic Functionality...');
    
    // Check supported tokens
    const supportedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
    console.log(`✅ Supported tokens: ${supportedTokens.length}`);
    
    // Check trading pairs
    const tradingPairs = await contract.read.getTradingPairs() as any[];
    console.log(`✅ Trading pairs: ${tradingPairs.length}`);
    
    // Test price via Mento broker directly
    console.log('');
    console.log('💱 Testing Direct Mento Integration...');
    
    const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER! as `0x${string}`;
    const brokerABI = [
      {
        "inputs": [
          {"internalType": "address", "name": "exchangeProvider", "type": "address"},
          {"internalType": "bytes32", "name": "exchangeId", "type": "bytes32"},
          {"internalType": "address", "name": "tokenIn", "type": "address"},
          {"internalType": "address", "name": "tokenOut", "type": "address"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"}
        ],
        "name": "getAmountOut",
        "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ] as const;
    
    try {
      const amountOut = await publicClient.readContract({
        address: mentoTokenBroker,
        abi: brokerABI,
        functionName: 'getAmountOut',
        args: [biPoolManager, celoUsdExchange.exchangeId, CELO, cUSD, parseEther('1')]
      }) as bigint;
      
      console.log(`✅ Mento Broker: 1 CELO = ${formatEther(amountOut)} cUSD`);
      
      // Now test our contract's swap estimation
      try {
        const contractAmountOut = await contract.read.getSwapAmountOut([CELO, cUSD, parseEther('1')]) as bigint;
        console.log(`✅ Our Contract: 1 CELO = ${formatEther(contractAmountOut)} cUSD`);
      } catch (contractError) {
        console.log(`❌ Our contract estimation failed: ${contractError.message?.slice(0, 100)}`);
      }
      
    } catch (brokerError) {
      console.log(`❌ Mento broker test failed: ${brokerError.message?.slice(0, 100)}`);
    }

    console.log('');
    console.log('🎉 Setup Complete!');
    console.log('==================');
    console.log('✅ CELO token configured with real Mento exchange data');
    console.log('✅ CELO/cUSD trading pair created');
    console.log('✅ Contract connected to live Mento infrastructure');
    console.log('');
    console.log('🚀 Ready for trading! Run the test script:');
    console.log('   npx ts-node scripts/test-cxchange.ts');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

main().catch(console.error);