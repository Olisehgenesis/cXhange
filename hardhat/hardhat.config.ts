import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import { config as dotEnvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

dotEnvConfig();

const config: HardhatUserConfig = {
  networks: {
    alfajores: {
      accounts: [process.env.PRIVATE_KEY ?? '0x0'],
      url: 'https://alfajores-forno.celo-testnet.org',
    },
    celo: {
      accounts: [process.env.PRIVATE_KEY ?? '0x0'],
      url: 'https://forno.celo.org',
    },
  },
  etherscan: {
    apiKey: process.env.CELOSCAN_API_KEY ?? '',
    customChains: [
      {
        chainId: 44_787,
        network: 'alfajores',
        urls: {
          apiURL: 'https://api-alfajores.celoscan.io/api',
          browserURL: 'https://alfajores.celoscan.io',
        },
      },
      {
        chainId: 42_220,
        network: 'celo',
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io/',
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  solidity: {
    version: '0.8.28',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

export default config;
