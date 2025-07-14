import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, createPublicClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import cXchangev4Artifact from '../artifacts/contracts/cXchangev4.sol/cXchangev4.json';
import fs from 'fs';
import path from 'path';

// Environment variables
const contractAddress = process.env.CONTRACT_ADDRESS_V4! as `0x${string}`;
const privateKey = process.env.PRIVATE_KEY!;

// ERC20 ABI for reading token details
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

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

  const contract = getContract({
    address: contractAddress,
    abi: cXchangev4Artifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });

  console.log('Fetching supported tokens from cXchange v4...');
  const supportedTokens = await contract.read.getSupportedTokens() as `0x${string}`[];
  console.log(`Found ${supportedTokens.length} tokens.`);

  const assets: Array<{ address: string; name: string; symbol: string; decimals: number }> = [];

  for (const tokenAddress of supportedTokens) {
    try {
      const [name, symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'name',
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>
      ]);
      assets.push({ address: tokenAddress, name, symbol, decimals });
      console.log(`  ✓ ${symbol} (${name}) - ${tokenAddress}`);
    } catch (error) {
      console.log(`  ✗ Failed to fetch metadata for ${tokenAddress}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Write to assets.json
  const outputPath = path.join(__dirname, 'assets.json');
  fs.writeFileSync(outputPath, JSON.stringify(assets, null, 2));
  console.log(`\nSaved ${assets.length} assets to ${outputPath}`);
}

main().catch((err) => {
  console.error('Error running get-assets:', err);
  process.exit(1);
});
