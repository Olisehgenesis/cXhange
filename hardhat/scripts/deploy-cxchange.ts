import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangeArtifact from '../artifacts/contracts/cXchange.sol/cXchange.json';

// Load environment variables
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER!;
const sortedOracles = process.env.SORTED_ORACLES!;
const biPoolManager = process.env.BI_POOL_MANAGER!;
const baseToken = process.env.BASE_TOKEN!;
const privateKey = process.env.PRIVATE_KEY!;

if (!mentoTokenBroker || !sortedOracles || !biPoolManager || !baseToken || !privateKey) {
  console.log(mentoTokenBroker, sortedOracles, biPoolManager, baseToken);
  //throw error on specific one
  if (!mentoTokenBroker) {
    throw new Error('MENTO_TOKEN_BROKER is not set');
  }
  if (!sortedOracles) {
    throw new Error('SORTED_ORACLES is not set');
  }
  if (!biPoolManager) {
    throw new Error('BI_POOL_MANAGER is not set');
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
  const abi = cXchangeArtifact.abi;
  const bytecode = cXchangeArtifact.bytecode as `0x${string}`;

  console.log('Deploying cXchange to Alfajores...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [mentoTokenBroker, sortedOracles, biPoolManager, baseToken],
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
  console.log('cXchange deployed at:', receipt.contractAddress);
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
}); 