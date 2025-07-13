import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, getContract, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchange.sol/cXchange.json';

const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
const biPoolManager = process.env.BI_POOL_MANAGER! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

const CELO = '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9' as `0x${string}`;
const cUSD = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as `0x${string}`;
const EXCHANGE_ID = '0x3135b662c38265d0655177091f1b647b4fef511103d06c016efdf18b46930d2c' as `0x${string}`;

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

  console.log('🔧 Fixing Exchange Providers...');
  console.log('================================');

  const contract = getContract({
    address: contractAddress,
    abi: cXchangeArtifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  try {
    // Update exchange provider for CELO -> cUSD
    console.log('Updating CELO -> cUSD exchange provider...');
    const hash1 = await contract.write.updateExchangeProvider([
      CELO, 
      cUSD,
      biPoolManager,
      EXCHANGE_ID,
      cUSD // Use cUSD address as rateFeedId (address type)
    ]);
    
    await publicClient.waitForTransactionReceipt({ hash: hash1 });
    console.log('✅ CELO -> cUSD provider updated');

    // Update exchange provider for cUSD -> CELO (reverse direction)
    console.log('Updating cUSD -> CELO exchange provider...');
    const hash2 = await contract.write.updateExchangeProvider([
      cUSD,
      CELO, 
      biPoolManager,
      EXCHANGE_ID,
      cUSD // Use cUSD address as rateFeedId (address type)
    ]);
    
    await publicClient.waitForTransactionReceipt({ hash: hash2 });
    console.log('✅ cUSD -> CELO provider updated');

    // Verify the fix
    console.log('\n🧪 Verifying Fix...');
    const [provider, exchangeId, active] = await contract.read.getTokenExchangeProvider([CELO, cUSD]) as [`0x${string}`, `0x${string}`, boolean, `0x${string}`, bigint];
    console.log(`CELO -> cUSD Provider: ${provider}`);
    console.log(`Exchange ID: ${exchangeId}`);
    console.log(`Active: ${active}`);

    if (active && provider !== '0x0000000000000000000000000000000000000000') {
      console.log('\n💰 Testing Price Fetching...');
      try {
        const amountOut = await contract.read.getSwapAmountOut([CELO, cUSD, parseEther('1')]) as bigint;
        console.log(`✅ 1 CELO = ${formatEther(amountOut)} cUSD`);
        
        console.log('\n🎉 Everything is working!');
        console.log('🚀 Now run the trading test:');
        console.log('   npx ts-node scripts/trade-test.ts');
      } catch (priceError) {
        console.log(`❌ Price fetching still failing: ${priceError.message?.slice(0, 100)}`);
      }
    } else {
      console.log('\n❌ Fix may not have worked properly');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

main().catch(console.error);