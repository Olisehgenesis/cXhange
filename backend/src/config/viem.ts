import { createPublicClient, http } from 'viem'
import { celoAlfajores } from 'viem/chains'

const rpcUrl = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org'

export const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(rpcUrl),
}) as any

// Contract addresses
export const CONTRACT_ADDRESSES = {
  MENTO_TOKEN_BROKER: process.env.MENTO_TOKEN_BROKER as `0x${string}`,
  BI_POOL_MANAGER: process.env.BI_POOL_MANAGER as `0x${string}`,
  SIMPLE_DEX: process.env.SIMPLE_DEX_ADDRESS as `0x${string}`,
} as const

// Validate contract addresses
Object.entries(CONTRACT_ADDRESSES).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing contract address for ${key}`)
  }
}) 