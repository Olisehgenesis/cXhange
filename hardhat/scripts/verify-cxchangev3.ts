import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';

// Load environment variables
const contractAddress = process.env.CONTRACT_ADDRESS_V3!;
const mentoTokenBroker = process.env.MENTO_TOKEN_BROKER!;
const baseToken = process.env.BASE_TOKEN!;
const celoscanApiKey = process.env.CELOSCAN_API_KEY!;

if (!contractAddress || !mentoTokenBroker || !baseToken || !celoscanApiKey) {
  console.log('Missing environment variables:', {
    contractAddress,
    mentoTokenBroker,
    baseToken
  });
  
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS_V3 is not set');
  }
  if (!mentoTokenBroker) {
    throw new Error('MENTO_TOKEN_BROKER is not set');
  }
  if (!baseToken) {
    throw new Error('BASE_TOKEN is not set');
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

  console.log('Verifying cXchangev3 contract on Alfajores...');
  console.log('Contract address:', contractAddress);
  console.log('Constructor arguments:', [mentoTokenBroker, baseToken]);

  // Verify the contract using hardhat verify
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  try {
    const command = `npx hardhat verify --network alfajores ${contractAddress} ${mentoTokenBroker} ${baseToken}`;
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