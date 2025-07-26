import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchange.sol/cXchange.json';

const contractAddress = process.env.CONTRACT_ADDRESS! as `0x${string}`;
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER! as `0x${string}`;
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

  console.log('🔍 Debugging Swap Execution');
  console.log('============================');

  const contract = getContract({
    address: contractAddress,
    abi: cXchangeArtifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  const testAmount = parseEther('1');

  try {
    // 1. Test direct Mento broker call
    console.log('🧪 Testing Direct Mento Broker...');
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

    const directBrokerAmount = await publicClient.readContract({
      address: mentoTokenBroker,
      abi: brokerABI,
      functionName: 'getAmountOut',
      args: [biPoolManager, EXCHANGE_ID, CELO, cUSD, testAmount]
    }) as bigint;
    
    console.log(`✅ Direct Mento: 1 CELO = ${formatEther(directBrokerAmount)} cUSD`);

    // 2. Test our contract's swap estimation
    console.log('\n🧪 Testing Contract Swap Estimation...');
    const contractAmount = await contract.read.getSwapAmountOut([CELO, cUSD, testAmount]) as bigint;
    console.log(`✅ Our Contract: 1 CELO = ${formatEther(contractAmount)} cUSD`);

    // 3. Check liquidity pool info
    console.log('\n🧪 Checking Liquidity Pool...');
    const pairId = await contract.read.getPairId([CELO, cUSD]) as string;
    console.log(`Pair ID: ${pairId}`);
    
    const [tokenA, tokenB, reserveA, reserveB, totalShares, userShares] = 
      await contract.read.getLiquidityPoolInfo([pairId]) as [string, string, bigint, bigint, bigint, bigint];
    
    console.log(`Pool Token A: ${tokenA}`);
    console.log(`Pool Token B: ${tokenB}`);
    console.log(`Reserve A: ${formatEther(reserveA)}`);
    console.log(`Reserve B: ${formatEther(reserveB)}`);
    console.log(`Total Shares: ${formatEther(totalShares)}`);

    // 4. Check contract CELO balance
    console.log('\n🧪 Checking Contract State...');
    const contractCeloBalance = await publicClient.getBalance({ address: contractAddress });
    console.log(`Contract CELO Balance: ${formatEther(contractCeloBalance)}`);
    
    // 5. Check minimum liquidity threshold
    const minLiquidityThreshold = parseEther('1000'); // From contract
    console.log(`Min Liquidity Threshold: ${formatEther(minLiquidityThreshold)}`);

    // 6. Try a tiny swap first
    console.log('\n🧪 Testing Tiny Swap (0.01 CELO)...');
    const tinyAmount = parseEther('0.01');
    const tinyEstimate = await contract.read.getSwapAmountOut([CELO, cUSD, tinyAmount]) as bigint;
    console.log(`Tiny swap estimate: ${formatEther(tinyAmount)} CELO → ${formatEther(tinyEstimate)} cUSD`);

    try {
      console.log('Attempting tiny swap execution...');
      const tinySwapHash = await contract.write.swapExactTokensForTokens([
        CELO,
        cUSD,
        tinyAmount,
        tinyEstimate * 90n / 100n, // 10% slippage
        account.address
      ], {
        value: tinyAmount,
        gas: 1000000n // Set explicit gas limit
      });

      console.log(`✅ Tiny swap submitted: ${tinySwapHash}`);
      const tinyReceipt = await publicClient.waitForTransactionReceipt({ hash: tinySwapHash });
      console.log(`✅ Tiny swap ${tinyReceipt.status === 'success' ? 'succeeded' : 'failed'}!`);
      
      if (tinyReceipt.status === 'success') {
        console.log('\n🎉 Swap mechanism works! The issue might be with larger amounts.');
        console.log('💡 Try reducing the trade amount or checking for liquidity limits.');
      }

    } catch (tinySwapError) {
      console.log(`❌ Tiny swap failed: ${tinySwapError.message?.slice(0, 200)}`);
      
      // 7. Check if it's a liquidity pool issue
      console.log('\n🔍 Checking Pool Liquidity...');
      if (totalShares === 0n) {
        console.log('💡 No liquidity pool exists - swaps will go through Mento broker');
      } else {
        console.log('💡 Liquidity pool exists but may have insufficient funds');
      }

      // 8. Check trading pair configuration
      console.log('\n🔍 Checking Trading Pair Config...');
      const tradingPairs = await contract.read.getTradingPairs() as string[];
      console.log(`Active pairs: ${tradingPairs.length}`);
      
      if (tradingPairs.length > 0) {
        const [lastPrice, priceChange24h, volume24h] = await contract.read.getMarketData([tradingPairs[0]]) as [bigint, bigint, bigint];
        console.log(`Last price: ${formatEther(lastPrice)}`);
        console.log(`24h volume: ${formatEther(volume24h)}`);
      }
    }

  } catch (error) {
    console.error('❌ Debugging failed:', error);
  }
}

main().catch(console.error);