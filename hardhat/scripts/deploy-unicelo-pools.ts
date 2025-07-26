import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import UniceloPoolsArtifact from '../artifacts/contracts/UniceloPools.sol/UniceloPools.json';

// Uniswap V3 addresses on Celo mainnet from .env
const UNISWAP_V3_FACTORY = process.env.UNISWAP_V3_FACTORY!;
const NONFUNGIBLE_POSITION_MANAGER = process.env.NONFUNGIBLE_POSITION_MANAGER!;
const REWARD_TOKEN = process.env.REWARD_TOKEN!; // CELO or other reward token

if (!UNISWAP_V3_FACTORY || !NONFUNGIBLE_POSITION_MANAGER || !REWARD_TOKEN) {
  throw new Error('UNISWAP_V3_FACTORY, NONFUNGIBLE_POSITION_MANAGER, or REWARD_TOKEN is not set in .env');
}

const privateKey = process.env.PRIVATE_KEY!;
if (!privateKey) {
  throw new Error('PRIVATE_KEY is not set in .env');
}

async function main() {
  const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`);
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(),
  });
  const publicClient = createPublicClient({
    chain: celo,
    transport: http(),
  });

  const abi = UniceloPoolsArtifact.abi;
  const bytecode = UniceloPoolsArtifact.bytecode as `0x${string}`;

  console.log('Deploying UniceloPools to Celo mainnet...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [UNISWAP_V3_FACTORY, NONFUNGIBLE_POSITION_MANAGER, REWARD_TOKEN],
  });

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    console.log('Account has no balance:', account.address);
    throw new Error('Account has no balance');
  }

  console.log('Deployment transaction hash:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('UniceloPools deployed at:', receipt.contractAddress);
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
}); 