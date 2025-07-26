import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev3Artifact from '../artifacts/contracts/cXchangev3.sol/cXchangev3.json';

// Load environment variables
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER!;
const baseToken = process.env.BASE_TOKEN!;
const privateKey = process.env.PRIVATE_KEY!;

if (!mentoTokenBroker || !baseToken || !privateKey) {
  console.log('Environment variables:', { mentoTokenBroker, baseToken });
  //throw error on specific one
  if (!mentoTokenBroker) {
    throw new Error('MENTO_TOKEN_BROKER is not set');
  }
  if (!baseToken) {
    throw new Error('BASE_TOKEN is not set');
  }
  if (!privateKey) {
    throw new Error('PRIVATE_KEY is not set');
  }
  throw new Error('Missing required environment variables. Please check your .env file.');
}

async function main() {
  // Set up account and client
  const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`);
  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(),
  });
  //log the account address
  console.log('Account address:', account.address);
  
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
  });

  // Prepare contract deployment
  const abi = cXchangev3Artifact.abi;
  const bytecode = cXchangev3Artifact.bytecode as `0x${string}`;

  console.log('Deploying cXchangev3 to Alfajores...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [mentoTokenBroker, baseToken],
  });
  //check balance and if throw error
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    console.log('Account has no balance');
    //log the account address
    console.log('Account address:', account.address);
    throw new Error('Account has no balance');
  }

  console.log('Deployment transaction hash:', hash);
  // Wait for deployment receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('cXchangev3 deployed at:', receipt.contractAddress);
  
  // Save the contract address to environment
  console.log('');
  console.log('🎉 Deployment successful!');
  console.log('================================');
  console.log(`Contract Address: ${receipt.contractAddress}`);
  console.log(`Transaction Hash: ${hash}`);
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Add CONTRACT_ADDRESS_V3 to your .env file:');
  console.log(`   CONTRACT_ADDRESS_V3=${receipt.contractAddress}`);
  console.log('2. Run the verification script:');
  console.log('   npm run verify:v3');
  console.log('3. Run the setup script:');
  console.log('   npm run setup:v3');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
}); 