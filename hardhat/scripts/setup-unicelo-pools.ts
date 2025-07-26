import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { createWalletClient, http, checksumAddress, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import UniceloPoolsArtifact from '../artifacts/contracts/UniceloPools.sol/UniceloPools.json';

// MENTO_TOKENS mapping
const MENTO_TOKENS: Record<string, string> = {
  celo: '0x471EcE3750Da237f93B8E339c536989b8978a438',
  cusd: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  ceur: '0xD8763CBA276a3738e6de85b4B3BF5fded6d6cA73',
  creal: '0xe8537a3d056da446677b9e9d6c5db704eaab4787',
  cxof: '0x73F93dcc49cB8A239e2032663e9475dd5ef29A08',
  ckes: '0x456a3D042C0DbD3db53D5489e98dFb038553B0d0',
  cphp: '0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B',
  ccop: '0x8a567e2ae79ca692bd748ab832081c45de4041ea',
  cghs: '0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313',
  cgbp: '0xCCF663b1fF11028f0b19058d0f7B674004a40746',
  czar: '0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6',
  ccad: '0xff4Ab19391af240c311c54200a492233052B6325',
  caud: '0x7175504C455076F15c04A2F90a8e352281F492F9',
  cchf: '0xb55a79F398E759E43C95b979163f30eC87Ee131D',
  cjpy: '0xc45eCF20f3CD864B32D9794d6f76814aE8892e20',
  cngn: '0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71',
};

//get the contract address from the .env file
const contractAddress = process.env.POOL_CONTRACT_ADDRESS!;
if (!contractAddress) {
  throw new Error('POOL_CONTRACT_ADDRESS is not set in .env');
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

  const abi = UniceloPoolsArtifact.abi;
  const contract = {
    address: contractAddress as `0x${string}`,
    abi,
  };

  // 1. Configure all Mento assets dynamically
  let allAssets = Object.values(MENTO_TOKENS)
    .filter(addr => isAddress(addr))
    .map(addr => checksumAddress(addr) as `0x${string}`);
  console.log('Configuring all Mento assets...', allAssets);
  //make the aseres 
  const hash1 = await walletClient.writeContract({
    ...contract,
    functionName: 'configureMentoAssets',
    args: [allAssets],
  });
  console.log('configureMentoAssets tx hash:', hash1);

  // 2. Discover and setup pools for all unique MENTO_TOKENS pairs
  const rewardAllocation = BigInt(1000) * 10n ** 18n;
  const durationDays = 30;
  const multiplier = 100;

  const tokenKeys = Object.keys(MENTO_TOKENS);
  for (let i = 0; i < tokenKeys.length; i++) {
    for (let j = i + 1; j < tokenKeys.length; j++) {
      const rawA = MENTO_TOKENS[tokenKeys[i]];
      const rawB = MENTO_TOKENS[tokenKeys[j]];
      const ca = checksumAddress(rawA as `0x${string}`) as `0x${string}`;
      const cb = checksumAddress(rawB as `0x${string}`) as `0x${string}`;
      if (!isAddress(ca) || !isAddress(cb)) continue;
      const tokenA = ca;
      const tokenB = cb;
      try {
        const hash = await walletClient.writeContract({
          ...contract,
          functionName: 'discoverAndAddAllFeeTiers',
          args: [tokenA, tokenB, rewardAllocation, durationDays, multiplier],
        });
        console.log(`discoverAndAddAllFeeTiers for ${tokenKeys[i]}/${tokenKeys[j]} tx hash:`, hash);
      } catch (err) {
        console.error(`Failed to setup pool for ${tokenKeys[i]}/${tokenKeys[j]}:`, err);
      }
    }
  }

  console.log('Setup complete!');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
}); 