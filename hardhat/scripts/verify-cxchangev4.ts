import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';

// Load environment variables
const contractAddress = process.env.CONTRACT_ADDRESS_V4!;
const mentoBroker = process.env.MENTO_BROKER!;
const biPoolManager = process.env.BI_POOL_MANAGER!;
const celoscanApiKey = process.env.CELOSCAN_API_KEY!;

if (!contractAddress || !mentoBroker || !biPoolManager || !celoscanApiKey) {
  console.log('Missing environment variables:', {
    contractAddress,
    mentoBroker,
    biPoolManager
  });
  
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS_V4 is not set');
  }
  if (!mentoBroker) {
    throw new Error('MENTO_BROKER is not set');
  }
  if (!biPoolManager) {
    throw new Error('BI_POOL_MANAGER is not set');
  }
  if (!celoscanApiKey) {
    throw new Error('CELOSCAN_API_KEY is not set');
  }
  throw new Error('Missing required environment variables. Please check your .env file.');
}

async function main() {
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
  });

  console.log('Verifying cXchangev4 contract on Alfajores...');
  console.log('Contract address:', contractAddress);
  console.log('Constructor arguments:', [mentoBroker, biPoolManager]);

  // Verify the contract using hardhat verify
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  try {
    const command = `npx hardhat verify --network alfajores ${contractAddress} ${mentoBroker} ${biPoolManager}`;
    console.log('Running command:', command);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) {
      console.log('Verification output:', stdout);
    }
    if (stderr) {
      console.log('Verification stderr:', stderr);
    }
    
    console.log('Contract verification completed successfully!');
    console.log('View your contract on CeloScan: https://alfajores.celoscan.io/address/' + contractAddress);
    
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
}); 