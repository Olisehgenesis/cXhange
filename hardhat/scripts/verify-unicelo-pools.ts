import { execSync } from 'child_process';

//unwrap dotenv
import { config } from 'dotenv';

config();

// Uniswap V3 addresses on Celo mainnet from .env
const UNISWAP_V3_FACTORY = process.env.UNISWAP_V3_FACTORY!;
const NONFUNGIBLE_POSITION_MANAGER = process.env.NONFUNGIBLE_POSITION_MANAGER!;
const REWARD_TOKEN = process.env.REWARD_TOKEN!; 

const contractAddress = process.env.POOL_CONTRACT_ADDRESS!;
if (!UNISWAP_V3_FACTORY || !NONFUNGIBLE_POSITION_MANAGER || !REWARD_TOKEN || !contractAddress) {
    //check the specific varibales
    if (!UNISWAP_V3_FACTORY) {
        console.error('UNISWAP_V3_FACTORY is not set in .env');
        throw new Error('UNISWAP_V3_FACTORY is not set in .env');
    }
    if (!NONFUNGIBLE_POSITION_MANAGER) {
        console.error('NONFUNGIBLE_POSITION_MANAGER is not set in .env');
        throw new Error('NONFUNGIBLE_POSITION_MANAGER is not set in .env');
    }
    if (!REWARD_TOKEN) {
        console.error('REWARD_TOKEN is not set in .env');
        throw new Error('REWARD_TOKEN is not set in .env');
    }
    const contractAddress = process.env.POOL_CONTRACT_ADDRESS!;
    if (!contractAddress) {
        console.error('POOL_CONTRACT_ADDRESS is not set in .env');
        throw new Error('POOL_CONTRACT_ADDRESS is not set in .env');
    }

  console.error('UNISWAP_V3_FACTORY, NONFUNGIBLE_POSITION_MANAGER, or REWARD_TOKEN is not set in .env');
  throw new Error('UNISWAP_V3_FACTORY, NONFUNGIBLE_POSITION_MANAGER, or REWARD_TOKEN is not set in .env');
}


const verifyCmd = `npx hardhat verify --network celo ${contractAddress} ${UNISWAP_V3_FACTORY} ${NONFUNGIBLE_POSITION_MANAGER} ${REWARD_TOKEN}`;

try {
  console.log('Verifying UniceloPools contract...');
  execSync(verifyCmd, { stdio: 'inherit' });
  console.log('Verification complete!');
} catch (err) {
  console.error('Verification failed:', err);
  process.exit(1);
} 