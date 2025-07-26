import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { PoolDisplay } from './useTokenPairPools';

export interface StakeParams {
  pool: PoolDisplay;
  token: string;
  amount: string;
}

export interface StakeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  stakedAmount?: string;
}

export interface UseStakingReturn {
  stakeToPool: (params: StakeParams) => Promise<StakeResult>;
  isStaking: boolean;
  error: string | null;
  resetError: () => void;
}

// Mock staking contract ABI - replace with actual contract ABI
const STAKING_CONTRACT_ABI = [
  {
    name: 'stakeToPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'string' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getStakedAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'poolId', type: 'string' },
      { name: 'token', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

// Mock staking contract address - replace with actual address
const STAKING_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const useStaking = (): UseStakingReturn => {
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const stakeToPool = useCallback(async (params: StakeParams): Promise<StakeResult> => {
    if (!userAddress || !walletClient || !publicClient) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    const { pool, token, amount } = params;

    // Validate inputs
    if (!amount || parseFloat(amount) <= 0) {
      return {
        success: false,
        error: 'Invalid amount provided'
      };
    }

    if (!pool.alreadyAdded) {
      return {
        success: false,
        error: 'Pool is not active for staking'
      };
    }

    setIsStaking(true);
    setError(null);

    try {
      // Determine token details
      const isToken0 = token === pool.token0Symbol;
      const tokenAddress = isToken0 ? pool.token0 : pool.token1;
      const tokenDecimals = isToken0 ? pool.token0Decimals : pool.token1Decimals;

      // Convert amount to BigInt with proper decimals
      const stakeAmount = parseUnits(amount, tokenDecimals);

      console.log('Staking parameters:', {
        poolId: pool.id,
        token: tokenAddress,
        amount: stakeAmount.toString(),
        user: userAddress,
        tokenSymbol: token,
        decimals: tokenDecimals
      });

      // For now, we'll simulate the transaction
      // In a real implementation, you would:
      // 1. Check user's token balance
      // 2. Approve tokens for staking contract
      // 3. Call the staking contract's stakeToPool function
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success response
      const mockTransactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;

      console.log('Staking successful:', {
        transactionHash: mockTransactionHash,
        pool: `${pool.token0Symbol}/${pool.token1Symbol}`,
        token,
        amount,
        user: userAddress
      });

      return {
        success: true,
        transactionHash: mockTransactionHash,
        stakedAmount: amount
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Staking error:', err);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsStaking(false);
    }
  }, [userAddress, walletClient, publicClient]);

  return {
    stakeToPool,
    isStaking,
    error,
    resetError
  };
};

// Helper function to check user's staked amount
export const getUserStakedAmount = async (
  publicClient: any,
  userAddress: string,
  poolId: string,
  tokenAddress: string
): Promise<string> => {
  try {
    const stakedAmount = await publicClient.readContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_CONTRACT_ABI,
      functionName: 'getStakedAmount',
      args: [userAddress, poolId, tokenAddress]
    }) as bigint;

    return formatUnits(stakedAmount, 18);
  } catch (error) {
    console.error('Error getting staked amount:', error);
    return '0';
  }
};

// Helper function to check user's token balance
export const getUserTokenBalance = async (
  publicClient: any,
  userAddress: string,
  tokenAddress: string,
  decimals: number
): Promise<string> => {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }
      ],
      functionName: 'balanceOf',
      args: [userAddress]
    }) as bigint;

    return formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0';
  }
};

// Helper function to estimate staking rewards
export const estimateStakingRewards = (
  stakedAmount: string,
  poolAPR: number,
  days: number = 1
): string => {
  try {
    const amount = parseFloat(stakedAmount);
    const dailyReward = (amount * poolAPR) / 365;
    const totalReward = dailyReward * days;
    return totalReward.toFixed(6);
  } catch (error) {
    console.error('Error estimating rewards:', error);
    return '0';
  }
}; 