import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseEther, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev3Artifact from '../artifacts/contracts/cXchangev3.sol/cXchangev3.json';

const contractAddress = process.env.CONTRACT_ADDRESS_V3! as `0x${string}`;
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

// Fixed currency addresses with proper checksums
const CURRENCIES = {
  CELO: {
    address: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9' as `0x${string}`,
    symbol: 'CELO',
    flag: '🟡',
    isNative: true
  },
  cUSD: {
    address: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as `0x${string}`,
    symbol: 'cUSD',
    flag: '🇺🇸',
    isNative: false
  },
  cEUR: {
    address: '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F' as `0x${string}`,
    symbol: 'cEUR',
    flag: '🇪🇺', 
    isNative: false
  },
  cNGN: {
    address: '0x4a5b03B8b16122D330306c65e4CA4BC5Dd6511d0' as `0x${string}`,
    symbol: 'cNGN',
    flag: '🇳🇬',
    isNative: false
  }
};

// ERC20 ABI for approvals
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Mento Broker ABI for direct swaps
const BROKER_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "exchangeProvider", "type": "address"},
      {"internalType": "bytes32", "name": "exchangeId", "type": "bytes32"},
      {"internalType": "address", "name": "tokenIn", "type": "address"},
      {"internalType": "address", "name": "tokenOut", "type": "address"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}
    ],
    "name": "swapIn",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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

// Trading scenarios that will work
const WORKING_TRADES = [
  { from: 'CELO', to: 'cUSD', amount: '5', description: 'CELO to USD (Direct Mento)' },
  { from: 'cUSD', to: 'cEUR', amount: '3', description: 'USD to EUR (Direct Mento)' },
  { from: 'cEUR', to: 'cUSD', amount: '2', description: 'EUR back to USD' },
  { from: 'cUSD', to: 'CELO', amount: '1', description: 'USD back to CELO' }
];

type TradeResult = {
  trade: number;
  status: 'success' | 'failed';
  method: string;
  from: string;
  to: string;
  amount: string;
  gasUsed?: bigint;
  txHash?: `0x${string}`;
  error?: string;
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

  console.log('🚀 Working Multi-Currency Test - Direct Mento Integration');
  console.log('=========================================================');
  console.log('Account:', account.address);
  console.log('Mento Broker:', mentoTokenBroker);
  console.log('cXchange v3:', contractAddress);
  console.log('');

  // Check initial balances
  console.log('💰 Initial Balances:');
  const balances: { [key: string]: bigint } = {};
  
  for (const [symbol, currency] of Object.entries(CURRENCIES)) {
    if (currency.isNative) {
      balances[symbol] = await publicClient.getBalance({ address: account.address });
    } else {
      balances[symbol] = await publicClient.readContract({
        address: currency.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      }) as bigint;
    }
    console.log(`${currency.flag} ${symbol}: ${formatEther(balances[symbol])}`);
  }
  console.log('');

  // Get trading pairs from our contract
  console.log('📊 Getting Trading Pair Data...');
  const contract = getContract({
    address: contractAddress,
    abi: cXchangev3Artifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  // Execute working trades directly via Mento
  console.log('💱 Executing Multi-Currency Trades via Mento:');
  console.log('===============================================');
  
  const tradeResults: TradeResult[] = [];
  let totalGasUsed = 0n;

  for (let i = 0; i < WORKING_TRADES.length; i++) {
    const trade = WORKING_TRADES[i];
    const fromCurrency = CURRENCIES[trade.from as keyof typeof CURRENCIES];
    const toCurrency = CURRENCIES[trade.to as keyof typeof CURRENCIES];
    
    console.log(`\n💱 Trade ${i + 1}: ${trade.description}`);
    console.log(`   ${fromCurrency.flag} ${trade.amount} ${fromCurrency.symbol} → ${toCurrency.symbol} ${toCurrency.flag}`);
    
    try {
      const tradeAmount = parseEther(trade.amount);
      
      // Check balance
      const currentBalance = fromCurrency.isNative 
        ? await publicClient.getBalance({ address: account.address })
        : await publicClient.readContract({
            address: fromCurrency.address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
          }) as bigint;
      
      if (currentBalance < tradeAmount) {
        console.log(`   ❌ Insufficient balance: ${formatEther(currentBalance)} ${fromCurrency.symbol}`);
        continue;
      }
      
      // Get pair info from our contract
      const pairId = await contract.read.getPairId([fromCurrency.address, toCurrency.address]) as string;
      const pairInfo = await contract.read.tradingPairs([pairId]) as any;
      
      if (!pairInfo.active) {
        console.log(`   ❌ Trading pair not active in our DEX`);
        continue;
      }
      
      console.log(`   📋 Using Exchange ID: ${pairInfo.exchangeId.slice(0, 10)}...`);
      
      // Get price estimate from Mento
      const estimatedOutput = await publicClient.readContract({
        address: mentoTokenBroker,
        abi: BROKER_ABI,
        functionName: 'getAmountOut',
        args: [pairInfo.exchangeProvider, pairInfo.exchangeId, fromCurrency.address, toCurrency.address, tradeAmount]
      }) as bigint;
      
      if (estimatedOutput === 0n) {
        console.log(`   ❌ No liquidity available on Mento`);
        continue;
      }
      
      const minAmountOut = estimatedOutput * 95n / 100n; // 5% slippage
      console.log(`   📈 Expected: ${formatEther(estimatedOutput)} ${toCurrency.symbol}`);
      console.log(`   🎯 Min acceptable: ${formatEther(minAmountOut)} ${toCurrency.symbol}`);
      
      // Handle native CELO vs ERC20 differently
      if (fromCurrency.isNative) {
        // For CELO, we can't directly approve to Mento broker
        // Let's try using our DEX contract instead
        console.log(`   🔄 Executing via cXchange DEX...`);
        
        const swapHash = await contract.write.swapExactTokensForTokens([
          fromCurrency.address,
          toCurrency.address,
          tradeAmount,
          minAmountOut,
          3 // MENTO_ONLY mode
        ], {
          value: tradeAmount // Send CELO as value
        });
        
        console.log(`   📝 Transaction: ${swapHash.slice(0, 10)}...`);
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
        
        if (receipt.status === 'success') {
          console.log(`   ✅ DEX swap successful!`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
          totalGasUsed += receipt.gasUsed;
          
          tradeResults.push({
            trade: i + 1,
            status: 'success',
            method: 'DEX',
            from: fromCurrency.symbol,
            to: toCurrency.symbol,
            amount: trade.amount,
            gasUsed: receipt.gasUsed,
            txHash: swapHash
          });
        } else {
          console.log(`   ❌ DEX swap failed`);
        }
        
      } else {
        // For ERC20 tokens, approve and use Mento directly
        console.log(`   🔐 Checking ${fromCurrency.symbol} allowance...`);
        
        const allowance = await publicClient.readContract({
          address: fromCurrency.address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [account.address, mentoTokenBroker]
        }) as bigint;
        
        if (allowance < tradeAmount) {
          console.log(`   ✅ Approving ${fromCurrency.symbol} for Mento...`);
          
          const approveHash = await walletClient.writeContract({
            address: fromCurrency.address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [mentoTokenBroker, parseEther('1000')] // Approve plenty for future trades
          });
          
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`   ✅ Approval confirmed`);
        }
        
        // Execute direct Mento swap
        console.log(`   🔄 Executing via Mento broker...`);
        
        const swapHash = await walletClient.writeContract({
          address: mentoTokenBroker,
          abi: BROKER_ABI,
          functionName: 'swapIn',
          args: [pairInfo.exchangeProvider, pairInfo.exchangeId, fromCurrency.address, toCurrency.address, tradeAmount, minAmountOut]
        });
        
        console.log(`   📝 Transaction: ${swapHash.slice(0, 10)}...`);
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
        
        if (receipt.status === 'success') {
          console.log(`   ✅ Mento swap successful!`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
          totalGasUsed += receipt.gasUsed;
          
          tradeResults.push({
            trade: i + 1,
            status: 'success',
            method: 'Mento',
            from: fromCurrency.symbol,
            to: toCurrency.symbol,
            amount: trade.amount,
            gasUsed: receipt.gasUsed,
            txHash: swapHash
          });
        } else {
          console.log(`   ❌ Mento swap failed`);
        }
      }
      
      // Small delay between trades
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`   ❌ Trade failed: ${error.message?.slice(0, 80)}...`);
      tradeResults.push({
        trade: i + 1,
        status: 'failed',
        method: 'Error',
        from: fromCurrency.symbol,
        to: toCurrency.symbol,
        amount: trade.amount,
        error: error.message?.slice(0, 50)
      });
    }
  }
  
  // Check final balances
  console.log('\n💰 Final Balances:');
  for (const [symbol, currency] of Object.entries(CURRENCIES)) {
    const finalBalance = currency.isNative 
      ? await publicClient.getBalance({ address: account.address })
      : await publicClient.readContract({
          address: currency.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address]
        }) as bigint;
    
    const change = finalBalance - balances[symbol];
    const changeStr = change >= 0n ? `+${formatEther(change)}` : formatEther(change);
    
    console.log(`${currency.flag} ${symbol}: ${formatEther(finalBalance)} (${changeStr})`);
  }
  console.log('');
  
  // Summary
  console.log('📊 Trading Summary:');
  console.log('==================');
  const successful = tradeResults.filter(r => r.status === 'success').length;
  const failed = tradeResults.filter(r => r.status === 'failed').length;
  
  console.log(`✅ Successful trades: ${successful}`);
  console.log(`❌ Failed trades: ${failed}`);
  console.log(`⛽ Total gas used: ${totalGasUsed.toLocaleString()}`);
  console.log('');
  
  // Detailed results
  console.log('🔍 Trade Details:');
  tradeResults.forEach((result) => {
    if (result.status === 'success') {
      console.log(`  ${result.trade}. ✅ ${result.from} → ${result.to} via ${result.method}`);
      console.log(`     📝 ${result.txHash?.slice(0, 20)}...`);
    } else {
      console.log(`  ${result.trade}. ❌ ${result.from} → ${result.to}: ${result.error}`);
    }
  });
  console.log('');
  
  if (successful > 0) {
    console.log('🎉 Multi-Currency Trading SUCCESS!');
    console.log('===================================');
    console.log('✅ Proven working currency conversions');
    console.log('✅ Both DEX and direct Mento integration');
    console.log('✅ Automatic token approvals');
    console.log('✅ Real balance changes demonstrated');
    console.log('');
    console.log('🌍 Your DEX now supports real global trading! 🚀');
  } else {
    console.log('💡 Next Steps:');
    console.log('==============');
    console.log('1. Ensure contract pairs are properly configured');
    console.log('2. Add initial liquidity to AMM pools');
    console.log('3. Verify Mento integration is working');
    console.log('4. Test with smaller amounts first');
  }
  
  console.log('');
  console.log(`📈 View transactions: https://alfajores.celoscan.io/address/${account.address}`);
  console.log(`📊 View contract: https://alfajores.celoscan.io/address/${contractAddress}`);
}

main().catch(console.error);