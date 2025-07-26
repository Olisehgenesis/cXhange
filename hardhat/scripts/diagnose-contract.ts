import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchange.sol/cXchange.json';

const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
const biPoolManager = process.env.BI_POOL_MANAGER! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

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

  console.log('🛡️  Safe Setup: Simple DEX with Error Handling');
  console.log('===============================================');
  console.log('Account:', account.address);
  console.log('Contract:', contractAddress);
  console.log('');

  const contract = getContract({
    address: contractAddress,
    abi: cXchangeArtifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  try {
    // First, verify permissions
    console.log('🔐 Step 1: Verifying Permissions...');
    
    const owner = await contract.read.owner() as `0x${string}`;
    const isOwner = owner.toLowerCase() === account.address.toLowerCase();
    const isAdmin = await contract.read.admins([account.address]) as boolean;
    const baseToken = await contract.read.baseToken() as `0x${string}`;
    
    console.log(`Owner: ${owner}`);
    console.log(`Your account: ${account.address}`);
    console.log(`Are you owner: ${isOwner ? 'YES' : 'NO'}`);
    console.log(`Are you admin: ${isAdmin ? 'YES' : 'NO'}`);
    console.log(`Base token: ${baseToken}`);
    
    if (!isOwner) {
      console.log('❌ You are not the contract owner!');
      console.log('💡 Either:');
      console.log('   1. Use the account that deployed the contract');
      console.log('   2. Have the current owner call transferOwnership()');
      return;
    }
    
    // Get current state
    const currentTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
    console.log(`✅ Currently supported tokens: ${currentTokens.length}`);
    currentTokens.forEach(token => console.log(`  • ${token}`));
    
    // Read exchanges
    console.log('\n📊 Step 2: Reading Exchanges...');
    const exchanges = await publicClient.readContract({
      address: biPoolManager,
      abi: BiPoolManagerABI,
      functionName: 'getExchanges',
    }) as any[];
    
    console.log(`Found ${exchanges.length} exchanges`);
    
    // Extract tokens, excluding already supported ones
    const uniqueTokens = new Set<string>();
    exchanges.forEach(exchange => {
      exchange.assets.forEach((asset: string) => {
        const lowerAsset = asset.toLowerCase();
        const alreadySupported = currentTokens.some(token => 
          token.toLowerCase() === lowerAsset
        );
        if (!alreadySupported) {
          uniqueTokens.add(asset);
        }
      });
    });
    
    console.log(`Found ${uniqueTokens.size} new tokens to add`);
    
    // Read token details for new tokens only
    console.log('\n📝 Step 3: Reading New Token Details...');
    const tokenInfos: TokenInfo[] = [];
    
    for (const tokenAddress of Array.from(uniqueTokens)) {
      const address = tokenAddress as `0x${string}`;
      
      try {
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
        
        const tokenExchanges = exchanges
          .filter(exchange => exchange.assets.some((asset: string) => asset.toLowerCase() === tokenAddress.toLowerCase()))
          .map(exchange => ({
            exchangeId: exchange.exchangeId,
            pairedWith: exchange.assets.find((asset: string) => asset.toLowerCase() !== tokenAddress.toLowerCase())!
          }));
        
        tokenInfos.push({
          address,
          name,
          symbol,
          decimals,
          exchanges: tokenExchanges
        });
        
        console.log(`  ✅ ${symbol} (${name})`);
        
      } catch (error) {
        console.log(`  ❌ Failed to read ${address}: ${error.message?.slice(0, 50)}...`);
      }
    }
    
    // Add tokens one by one with careful error handling
    console.log('\n🔧 Step 4: Adding New Tokens Safely...');
    
    let tokensAdded = 0;
    for (const token of tokenInfos) {
      try {
        console.log(`  Adding ${token.symbol}...`);
        
        // Check if already supported (double-check)
        const updatedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
        const alreadyExists = updatedTokens.some(existing => 
          existing.toLowerCase() === token.address.toLowerCase()
        );
        
        if (alreadyExists) {
          console.log(`    ℹ️  ${token.symbol} already supported`);
          continue;
        }
        
        // Simulate first
        await publicClient.simulateContract({
          address: contractAddress,
          abi: cXchangeArtifact.abi,
          functionName: 'addSupportedToken',
          args: [token.address],
          account: account.address
        });
        
        // Execute
        const hash = await contract.write.addSupportedToken([token.address]);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
          console.log(`    ✅ ${token.symbol} added successfully`);
          tokensAdded++;
        } else {
          console.log(`    ❌ ${token.symbol} transaction failed`);
        }
        
      } catch (error) {
        console.log(`    ❌ ${token.symbol} failed: ${error.message?.slice(0, 100)}...`);
      }
    }
    
    console.log(`\n✅ Added ${tokensAdded} new tokens`);
    
    // Add trading pairs
    console.log('\n📊 Step 5: Adding Trading Pairs...');
    
    // Get updated token list
    const finalTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
    const finalTokenSet = new Set(finalTokens.map(t => t.toLowerCase()));
    
    let pairsAdded = 0;
    for (const exchange of exchanges) {
      if (exchange.assets.length === 2) {
        const [tokenA, tokenB] = exchange.assets;
        
        // Check if both tokens are supported
        if (finalTokenSet.has(tokenA.toLowerCase()) && finalTokenSet.has(tokenB.toLowerCase())) {
          const tokenAInfo = tokenInfos.find(t => t.address.toLowerCase() === tokenA.toLowerCase()) ||
                            { symbol: 'Token A' }; // Fallback for base token
          const tokenBInfo = tokenInfos.find(t => t.address.toLowerCase() === tokenB.toLowerCase()) ||
                            { symbol: 'Token B' }; // Fallback for base token
          
          try {
            console.log(`  Adding pair: ${tokenAInfo.symbol}/${tokenBInfo.symbol}...`);
            
            // Simulate first
            await publicClient.simulateContract({
              address: contractAddress,
              abi: cXchangeArtifact.abi,
              functionName: 'addTradingPair',
              args: [tokenA, tokenB, biPoolManager, exchange.exchangeId, parseEther('0.1')],
              account: account.address
            });
            
            const hash = await contract.write.addTradingPair([
              tokenA,
              tokenB,
              biPoolManager,
              exchange.exchangeId,
              parseEther('0.1')
            ]);
            
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            
            if (receipt.status === 'success') {
              console.log(`    ✅ ${tokenAInfo.symbol}/${tokenBInfo.symbol} added`);
              pairsAdded++;
            } else {
              console.log(`    ❌ ${tokenAInfo.symbol}/${tokenBInfo.symbol} failed`);
            }
            
          } catch (error) {
            if (error.message?.includes('Pair already exists')) {
              console.log(`    ℹ️  ${tokenAInfo.symbol}/${tokenBInfo.symbol} already exists`);
            } else {
              console.log(`    ❌ ${tokenAInfo.symbol}/${tokenBInfo.symbol} failed: ${error.message?.slice(0, 50)}...`);
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Added ${pairsAdded} new trading pairs`);
    
    // Final verification
    console.log('\n🧪 Step 6: Final Verification...');
    
    const finalSupportedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
    const finalActivePairs = await contract.read.activePairs() as string[];
    
    console.log(`✅ Total supported tokens: ${finalSupportedTokens.length}`);
    console.log(`✅ Total active pairs: ${finalActivePairs.length}`);
    
    console.log('\n🎉 Safe Setup Complete!');
    console.log(`✅ Successfully added ${tokensAdded} tokens and ${pairsAdded} pairs`);
    console.log(`📊 View contract: https://alfajores.celoscan.io/address/${contractAddress}`);
    
  } catch (error) {
    console.error('❌ Safe setup failed:', error);
  }
}

main().catch(console.error);