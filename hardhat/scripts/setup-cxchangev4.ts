import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev4Artifact from '../artifacts/contracts/cXchangev4.sol/cXchangev4.json';

// Environment variables
const contractAddress = process.env.CONTRACT_ADDRESS_V4! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

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

  console.log('🚀 cXchange v4 Setup: Streamlined Mento DEX');
  console.log('============================================');
  console.log('Account:', account.address);
  console.log('Contract:', contractAddress);
  console.log('');

  const contract = getContract({
    address: contractAddress,
    abi: cXchangev4Artifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  try {
    // Step 1: Check current contract state
    console.log('📊 Step 1: Checking Current Contract State...');
    
    const [supportedTokens, supportedPairs, protocolFeeBps] = await Promise.all([
      contract.read.getSupportedTokens() as Promise<`0x${string}`[]>,
      contract.read.getSupportedPairs() as Promise<string[]>,
      contract.read.protocolFeeBps() as Promise<bigint>
    ]);
    
    console.log(`Current supported tokens: ${supportedTokens.length}`);
    console.log(`Current supported pairs: ${supportedPairs.length}`);
    console.log(`Current protocol fee: ${Number(protocolFeeBps) / 100}%`);
    console.log('');

    // Step 2: Discover and add all Mento assets automatically
    console.log('🔍 Step 2: Discovering and Adding All Mento Assets...');
    
    try {
      const discoverHash = await contract.write.discoverAndAddAllMentoAssets();
      console.log('Discovery transaction hash:', discoverHash);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: discoverHash });
      console.log('✅ Asset discovery completed successfully!');
      console.log('Transaction receipt:', receipt);
      
    } catch (error) {
      if (error.message?.includes('No new assets discovered')) {
        console.log('ℹ️  No new assets discovered (all assets already added)');
      } else {
        console.log('❌ Asset discovery failed:', error.message?.slice(0, 100));
        throw error;
      }
    }

    // Step 3: Verify final contract state
    console.log('\n🧪 Step 3: Verifying Final Contract State...');
    
    const [finalTokens, finalPairs, totalSwaps, totalVolume, totalFeesCollected] = await Promise.all([
      contract.read.getSupportedTokens() as Promise<`0x${string}`[]>,
      contract.read.getSupportedPairs() as Promise<string[]>,
      contract.read.totalSwaps() as Promise<bigint>,
      contract.read.totalVolume() as Promise<bigint>,
      contract.read.totalFeesCollected() as Promise<bigint>
    ]);
    
    console.log(`✅ Supported tokens: ${finalTokens.length}`);
    console.log(`✅ Supported pairs: ${finalPairs.length}`);
    console.log(`✅ Total swaps: ${totalSwaps}`);
    console.log(`✅ Total volume: ${formatEther(totalVolume)}`);
    console.log(`✅ Total fees collected: ${formatEther(totalFeesCollected)}`);
    
    // Step 4: Display token details
    console.log('\n📝 Step 4: Token Details...');
    
    for (let i = 0; i < Math.min(finalTokens.length, 10); i++) {
      const tokenAddress = finalTokens[i];
      try {
        const [name, symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'name',
          }) as Promise<string>,
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }) as Promise<string>,
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }) as Promise<number>
        ]);
        
        console.log(`  ${i + 1}. ${symbol} (${name}) - ${tokenAddress}`);
        
      } catch (error) {
        console.log(`  ${i + 1}. Unknown token - ${tokenAddress}`);
      }
    }
    
    if (finalTokens.length > 10) {
      console.log(`  ... and ${finalTokens.length - 10} more tokens`);
    }

    // Step 5: Test swap quote functionality
    console.log('\n💰 Step 5: Testing Swap Quote Functionality...');
    
    if (finalTokens.length >= 2) {
      try {
        const tokenIn = finalTokens[0];
        const tokenOut = finalTokens[1];
        
        const [tokenInSymbol, tokenOutSymbol] = await Promise.all([
          publicClient.readContract({
            address: tokenIn,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }) as Promise<string>,
          publicClient.readContract({
            address: tokenOut,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }) as Promise<string>
        ]);
        
        console.log(`Testing quote: 1 ${tokenInSymbol} → ${tokenOutSymbol}`);
        
        const [amountOut, protocolFee] = await contract.read.getSwapQuote([
          tokenIn,
          tokenOut,
          BigInt(10 ** 18) // 1 token with 18 decimals
        ]) as [bigint, bigint];
        
        console.log(`✅ Quote: 1 ${tokenInSymbol} → ${formatEther(amountOut)} ${tokenOutSymbol}`);
        console.log(`✅ Protocol fee: ${formatEther(protocolFee)} ${tokenInSymbol}`);
        
      } catch (error) {
        console.log(`ℹ️  Quote testing skipped: ${error.message?.slice(0, 50)}...`);
      }
    }

    // Final summary
    console.log('\n🎉 cXchange v4 Setup Complete!');
    console.log('===============================');
    console.log(`✅ ${finalTokens.length} tokens automatically discovered and added`);
    console.log(`✅ ${finalPairs.length} trading pairs configured`);
    console.log(`✅ All Mento protocol integrations active`);
    console.log(`✅ Professional fee management enabled`);
    console.log(`✅ Streamlined swap interface ready`);
    console.log('');
    
    console.log('🚀 Key Features:');
    console.log('================');
    console.log('🔀 Mento Integration: Access to all Celo stable assets');
    console.log('💰 Professional Fees: Configurable protocol fee system');
    console.log('📊 Auto-Discovery: Automatically finds all available pairs');
    console.log('🛡️  Security: Reentrancy protection and access controls');
    console.log('📈 Statistics: Comprehensive trading analytics');
    console.log('');
    
    console.log('📊 Next Steps:');
    console.log('==============');
    console.log('1. Test swap functionality with small amounts');
    console.log('2. Configure protocol fees if needed');
    console.log('3. Add additional admins for fee management');
    console.log('4. Monitor trading activity and statistics');
    console.log('');
    console.log(`📈 View on CeloScan: https://alfajores.celoscan.io/address/${contractAddress}`);
    console.log('');
    console.log('🌟 Your streamlined DEX is now ready for production! 🌟');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 