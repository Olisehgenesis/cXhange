import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPublicClient, createWalletClient, http, formatEther, getContract, parseEther, custom } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import cXchangev4Artifact from '../abis/cXchangev4.json';

// Types
interface TokenStats {
  volume: string;
  swapCount: string;
  accumulatedFees: string;
}

interface ProtocolStats {
  totalSwaps: string;
  totalVolume: string;
  totalFeesCollected: string;
  supportedTokensCount: string;
  supportedPairsCount: string;
  currentFeeBps: string;
}

interface PairInfo {
  supported: boolean;
  exchangeProvider: string;
  exchangeId: string;
}

interface SwapQuote {
  amountOut: string;
  protocolFee: string;
}

interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin?: string;
  slippagePercent?: number;
}

interface SwapResult {
  hash: string;
  amountOut: string;
  protocolFee: string;
}

interface UseCXchangeProps {
  contractAddress: `0x${string}`;
  account?: `0x${string}`;
  chainId: number; // Add chainId as required prop
}

interface UseCXchangeReturn {
  // Data
  supportedTokens: string[];
  supportedPairs: string[];
  protocolStats: ProtocolStats | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingTokens: boolean;
  isLoadingPairs: boolean;
  isLoadingStats: boolean;
  isSwapping: boolean;
  
  // Error states
  error: string | null;
  swapError: string | null;
  
  // View methods
  getSupportedTokens: () => Promise<string[]>;
  getSupportedPairs: () => Promise<string[]>;
  isPairSupported: (tokenA: string, tokenB: string) => Promise<boolean>;
  getPairInfo: (pairId: string) => Promise<PairInfo>;
  getProtocolStats: () => Promise<ProtocolStats>;
  getTokenStats: (token: string) => Promise<TokenStats>;
  getSwapQuote: (tokenIn: string, tokenOut: string, amountIn: string) => Promise<SwapQuote>;
  generatePairId: (tokenA: string, tokenB: string) => Promise<string>;
  
  // Write methods
  executeSwap: (params: SwapParams) => Promise<SwapResult>;
  calculateMinAmountOut: (amountOut: string, slippagePercent: number) => string;
  
  // Utility methods
  refreshAllData: () => Promise<void>;
  formatAmount: (amount: string) => string;
}

function getCeloChain(chainId: number) {
  if (chainId === celo.id) return celo;
  if (chainId === celoAlfajores.id) return celoAlfajores;
  throw new Error('Unsupported chain: Only Celo Mainnet and Alfajores are supported');
}

export function useCXchange({ contractAddress, account, chainId }: UseCXchangeProps): UseCXchangeReturn {
  // State
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [supportedPairs, setSupportedPairs] = useState<string[]>([]);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);
  
  // Loading states
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  
  // Dynamically get chain config
  const chain = useMemo(() => {
    try {
      return getCeloChain(chainId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unsupported chain');
      return null;
    }
  }, [chainId]);

  // Dynamically create public client
  const publicClient = useMemo(() => {
    if (!chain) return null;
    return createPublicClient({
      chain,
      transport: http(),
    });
  }, [chain]);

  // Wallet client for write operations
  const walletClient = useMemo(() => {
    if (
      typeof window !== 'undefined' &&
      (window as any).ethereum &&
      account &&
      chain
    ) {
      return createWalletClient({
        chain,
        transport: custom((window as any).ethereum),
        account,
      });
    }
    return null;
  }, [account, chain]);

  // Contract instances
  const readContract = useMemo(() => {
    if (!contractAddress || !publicClient) return null;
    return getContract({
      address: contractAddress,
      abi: cXchangev4Artifact.abi,
      client: publicClient,
    });
  }, [contractAddress, publicClient]);

  const writeContract = useMemo(() => {
    if (!contractAddress || !walletClient || !publicClient) return null;
    return getContract({
      address: contractAddress,
      abi: cXchangev4Artifact.abi,
      client: { public: publicClient, wallet: walletClient },
    });
  }, [contractAddress, walletClient, publicClient]);
  
  // Computed loading state
  const isLoading = isLoadingTokens || isLoadingPairs || isLoadingStats;
  
  // Get supported tokens
  const getSupportedTokens = useCallback(async (): Promise<string[]> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    setIsLoadingTokens(true);
    setError(null);
    
    try {
      const tokens = await readContract.read.getSupportedTokens() as string[];
      setSupportedTokens(tokens);
      return tokens;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get supported tokens';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [readContract]);
  
  // Get supported pairs
  const getSupportedPairs = useCallback(async (): Promise<string[]> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    setIsLoadingPairs(true);
    setError(null);
    
    try {
      const pairs = await readContract.read.getSupportedPairs() as string[];
      setSupportedPairs(pairs);
      return pairs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get supported pairs';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoadingPairs(false);
    }
  }, [readContract]);
  
  // Check if pair is supported
  const isPairSupported = useCallback(async (tokenA: string, tokenB: string): Promise<boolean> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    try {
      const isSupported = await readContract.read.isPairSupported([tokenA, tokenB]) as boolean;
      return isSupported;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check pair support';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [readContract]);
  
  // Get pair info
  const getPairInfo = useCallback(async (pairId: string): Promise<PairInfo> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    try {
      const [supported, exchangeProvider, exchangeId] = await readContract.read.getPairInfo([pairId]) as [boolean, string, string];
      return {
        supported,
        exchangeProvider,
        exchangeId
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get pair info';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [readContract]);
  
  // Get protocol stats
  const getProtocolStats = useCallback(async (): Promise<ProtocolStats> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    setIsLoadingStats(true);
    setError(null);
    
    try {
      const [
        totalSwaps,
        totalVolume,
        totalFeesCollected,
        supportedTokensCount,
        supportedPairsCount,
        currentFeeBps
      ] = await readContract.read.getProtocolStats() as [bigint, bigint, bigint, bigint, bigint, bigint];
      
      const stats: ProtocolStats = {
        totalSwaps: totalSwaps.toString(),
        totalVolume: formatEther(totalVolume),
        totalFeesCollected: formatEther(totalFeesCollected),
        supportedTokensCount: supportedTokensCount.toString(),
        supportedPairsCount: supportedPairsCount.toString(),
        currentFeeBps: currentFeeBps.toString()
      };
      
      setProtocolStats(stats);
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get protocol stats';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoadingStats(false);
    }
  }, [readContract]);
  
  // Get token stats
  const getTokenStats = useCallback(async (token: string): Promise<TokenStats> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    try {
      const [volume, swapCount, accumulatedFees] = await readContract.read.getTokenStats([token]) as [bigint, bigint, bigint];
      
      return {
        volume: formatEther(volume),
        swapCount: swapCount.toString(),
        accumulatedFees: formatEther(accumulatedFees)
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get token stats';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [readContract]);
  
  // Get swap quote
  const getSwapQuote = useCallback(async (tokenIn: string, tokenOut: string, amountIn: string): Promise<SwapQuote> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    try {
      const amountInWei = parseEther(amountIn);
      const [amountOut, protocolFee] = await readContract.read.getSwapQuote([tokenIn, tokenOut, amountInWei]) as [bigint, bigint];
      
      return {
        amountOut: formatEther(amountOut),
        protocolFee: formatEther(protocolFee)
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get swap quote';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [readContract]);
  
  // Generate pair ID
  const generatePairId = useCallback(async (tokenA: string, tokenB: string): Promise<string> => {
    if (!readContract) throw new Error('Contract not initialized');
    
    try {
      const pairId = await readContract.read.generatePairId([tokenA, tokenB]) as string;
      return pairId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate pair ID';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [readContract]);
  
  // ================================
  // WRITE FUNCTIONS (TRADING)
  // ================================
  
  // Fix: Move refreshAllData above executeSwap to avoid use-before-declaration
  const refreshAllData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        getSupportedTokens(),
        getSupportedPairs(),
        getProtocolStats(),
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [getSupportedTokens, getSupportedPairs, getProtocolStats]);

  // Calculate minimum amount out with slippage
  const calculateMinAmountOut = useCallback((amountOut: string, slippagePercent: number): string => {
    const amount = parseFloat(amountOut);
    const slippageMultiplier = (100 - slippagePercent) / 100;
    const minAmount = amount * slippageMultiplier;
    return minAmount.toString();
  }, []);

  // Execute swap
  const executeSwap = useCallback(async (params: SwapParams): Promise<SwapResult> => {
    if (!writeContract) throw new Error('Wallet not connected or contract not initialized');
    if (!account) throw new Error('Account not connected');
    setIsSwapping(true);
    setSwapError(null);
    try {
      const { tokenIn, tokenOut, amountIn, amountOutMin, slippagePercent = 0.5 } = params;
      // Get fresh quote
      const quote = await getSwapQuote(tokenIn, tokenOut, amountIn);
      // Calculate minimum amount out if not provided
      let finalAmountOutMin = amountOutMin;
      if (!finalAmountOutMin) {
        finalAmountOutMin = calculateMinAmountOut(quote.amountOut, slippagePercent);
      }
      if (typeof finalAmountOutMin !== 'string') {
        throw new Error('Invalid minimum amount out');
      }
      const amountInWei = parseEther(amountIn);
      const amountOutMinWei = parseEther(finalAmountOutMin);
      // Execute the swap
      const hash = await writeContract.write.swap([
        tokenIn,
        tokenOut,
        amountInWei,
        amountOutMinWei,
      ]);
      // Wait for transaction confirmation
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      if (receipt.status === 'success') {
        // Refresh data after successful swap
        await refreshAllData();
        return {
          hash,
          amountOut: quote.amountOut,
          protocolFee: quote.protocolFee,
        };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setSwapError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  }, [writeContract, account, getSwapQuote, calculateMinAmountOut, refreshAllData, publicClient]);
  
  // Format amount utility
  const formatAmount = useCallback((amount: string): string => {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 0.001) return num.toExponential(3);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    return (num / 1000000).toFixed(2) + 'M';
  }, []);
  
  // Initial data loading
  useEffect(() => {
    if (readContract) {
      refreshAllData().catch(console.error);
    }
  }, [readContract, refreshAllData]);
  
  return {
    // Data
    supportedTokens,
    supportedPairs,
    protocolStats,
    
    // Loading states
    isLoading,
    isLoadingTokens,
    isLoadingPairs,
    isLoadingStats,
    isSwapping,
    
    // Error states
    error,
    swapError,
    
    // View methods
    getSupportedTokens,
    getSupportedPairs,
    isPairSupported,
    getPairInfo,
    getProtocolStats,
    getTokenStats,
    getSwapQuote,
    generatePairId,
    
    // Write methods
    executeSwap,
    calculateMinAmountOut,
    
    // Utility methods
    refreshAllData,
    formatAmount
  };
}

// Fix: Add window.ethereum type for TS
declare global {
  interface Window {
    ethereum?: any;
  }
}
