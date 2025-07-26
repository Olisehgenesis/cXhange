import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev4Artifact from '../artifacts/contracts/cXchangev4.sol/cXchangev4.json';

// Load environment variables
const mentoBroker = process.env.MENTO_BROKER!;
const biPoolManager = process.env.BI_POOL_MANAGER!;
const privateKey = process.env.PRIVATE_KEY!;

if (!mentoBroker || !biPoolManager || !privateKey) {
  console.log('Environment variables:', { mentoBroker, biPoolManager });
  //throw error on specific one
  if (!mentoBroker) {
    throw new Error('MENTO_BROKER is not set');
  }
  if (!biPoolManager) {
    throw new Error('BI_POOL_MANAGER is not set');
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
  const abi = cXchangev4Artifact.abi;
  const bytecode = cXchangev4Artifact.bytecode as `0x${string}`;

  console.log('Deploying cXchangev4 to Alfajores...');
  console.log('Constructor parameters:');
  console.log('  - Mento Broker:', mentoBroker);
  console.log('  - BiPool Manager:', biPoolManager);
  
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [mentoBroker, biPoolManager],
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
  console.log('cXchangev4 deployed at:', receipt.contractAddress);
  
  // Save the contract address to environment
  console.log('');
  console.log('🎉 Deployment successful!');
  console.log('================================');
  console.log(`Contract Address: ${receipt.contractAddress}`);
  console.log(`Transaction Hash: ${hash}`);
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Add CONTRACT_ADDRESS_V4 to your .env file:');
  console.log(`   CONTRACT_ADDRESS_V4=${receipt.contractAddress}`);
  console.log('2. Run the verification script:');
  console.log('   npm run verify:v4');
  console.log('3. Run the setup script (if needed):');
  console.log('   npm run setup:v4');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
}); 