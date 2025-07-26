import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import poolAbiJson from '../abis/poolAbi.json';
import erc20AbiJson from '../abis/erc20Abi.json';

const poolAbi = poolAbiJson.abi;
const erc20Abi = erc20AbiJson.abi;

const CONTRACTS = {
  POOL: '0xc15895836b9727157dc6accf824eeb9f2b9cd113' as `0x${string}`,
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438' as `0x${string}`,
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
  cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73' as `0x${string}`,
  cREAL: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787' as `0x${string}`
};

const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

export type PoolDisplay = {
  id: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  fee: number;
  poolAddress: string;
  exists: boolean;
  alreadyAdded: boolean;
  totalLiquidity: bigint;
  rewardPerSecond: bigint;
  multiplier: number;
  uniswapLiquidity: bigint;
  currentTick: number;
};

export type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
};

const useTokenPairPools = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolDisplay[]>([]);
  const [supportedTokens, setSupportedTokens] = useState<TokenInfo[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Progressive loading callback
  const onPoolDiscovered = useCallback((pool: PoolDisplay) => {
    setPools(prev => {
      // Check if pool already exists
      const exists = prev.some(p => p.id === pool.id);
      if (!exists) {
        return [...prev, pool];
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const fetchPoolsData = async () => {
      setLoading(true);
      setError(null);
      setPools([]);
      
      try {
        const publicClient = createPublicClient({
          chain: celo,
          transport: http(),
        });

        // 1. Get supported tokens from contract
        const tokenAddresses = await publicClient.readContract({
          address: CONTRACTS.POOL,
          abi: poolAbi,
          functionName: 'getSupportedTokens',
        }) as string[];

        // 2. Get token details (symbol, decimals)
        const tokens: TokenInfo[] = await Promise.all(
          tokenAddresses.map(async (tokenAddress) => {
            const [symbol, decimals] = await Promise.all([
              publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'symbol',
              }),
              publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'decimals',
              })
            ]);

            return {
              address: tokenAddress,
              symbol: symbol as string,
              decimals: Number(decimals)
            };
          })
        );

        setSupportedTokens(tokens);
        setLoading(false);
        setIsDiscovering(true);

        // 3. Discover potential pools progressively
        const allPotentialPools: PoolDisplay[] = [];

        // Check each token against CELO, cUSD
        for (const token of tokens) {
          // Skip if it's already CELO or cUSD to avoid duplicates
          if (token.address.toLowerCase() === CONTRACTS.CELO.toLowerCase() || 
              token.address.toLowerCase() === CONTRACTS.cUSD.toLowerCase()) {
            continue;
          }

          // Check token vs CELO
          await checkTokenPair(
            publicClient,
            token,
            tokens.find(t => t.address.toLowerCase() === CONTRACTS.CELO.toLowerCase())!,
            allPotentialPools,
            onPoolDiscovered
          );

          // Check token vs cUSD
          await checkTokenPair(
            publicClient,
            token,
            tokens.find(t => t.address.toLowerCase() === CONTRACTS.cUSD.toLowerCase())!,
            allPotentialPools,
            onPoolDiscovered
          );
        }

        // Also check CELO vs cUSD
        const celoToken = tokens.find(t => t.address.toLowerCase() === CONTRACTS.CELO.toLowerCase());
        const cusdToken = tokens.find(t => t.address.toLowerCase() === CONTRACTS.cUSD.toLowerCase());
        
        if (celoToken && cusdToken) {
          await checkTokenPair(
            publicClient,
            celoToken,
            cusdToken,
            allPotentialPools,
            onPoolDiscovered
          );
        }

        setIsDiscovering(false);

      } catch (e: any) {
        console.error('Error fetching pools:', e);
        setError(e.message || 'Error fetching pools');
        setLoading(false);
        setIsDiscovering(false);
      }
    };

    fetchPoolsData();
  }, [onPoolDiscovered]);

  return { 
    loading, 
    error, 
    pools, // All discovered pools
    supportedTokens,
    isDiscovering
  };
};

// Helper function to check token pairs across all fee tiers
const checkTokenPair = async (
  publicClient: any,
  token0: TokenInfo,
  token1: TokenInfo,
  allPools: PoolDisplay[],
  onPoolDiscovered: (pool: PoolDisplay) => void
) => {
  for (const fee of FEE_TIERS) {
    try {
      // Check if pool exists in Uniswap
      const poolExists = await publicClient.readContract({
        address: CONTRACTS.POOL,
        abi: poolAbi,
        functionName: 'checkPoolExists',
        args: [token0.address, token1.address, fee],
      }) as [boolean, string, boolean];

      const [exists, poolAddress, alreadyAdded] = poolExists;

      if (exists) {
        // Generate pool ID
        const poolId = await publicClient.readContract({
          address: CONTRACTS.POOL,
          abi: poolAbi,
          functionName: 'getPoolId',
          args: [token0.address, token1.address, fee],
        }) as string;

        let detailedInfo = null;
        if (alreadyAdded) {
          // Get detailed info if already added to our contract
          try {
            detailedInfo = await publicClient.readContract({
              address: CONTRACTS.POOL,
              abi: poolAbi,
              functionName: 'getDetailedPoolInfo',
              args: [poolId],
            }) as any;
          } catch (e) {
            // Pool might not be added to our rewards contract yet
          }
        }

        const pool: PoolDisplay = {
          id: poolId,
          token0: token0.address,
          token1: token1.address,
          token0Symbol: token0.symbol,
          token1Symbol: token1.symbol,
          token0Decimals: token0.decimals,
          token1Decimals: token1.decimals,
          fee: fee,
          poolAddress: poolAddress,
          exists: true,
          alreadyAdded: alreadyAdded,
          totalLiquidity: detailedInfo ? detailedInfo[0].totalLiquidity : 0n,
          rewardPerSecond: detailedInfo ? detailedInfo[0].rewardPerSecond : 0n,
          multiplier: detailedInfo ? Number(detailedInfo[0].multiplier) : 0,
          uniswapLiquidity: detailedInfo ? detailedInfo[1] : 0n,
          currentTick: detailedInfo ? Number(detailedInfo[2]) : 0
        };

        allPools.push(pool);
        onPoolDiscovered(pool);
      }
    } catch (e) {
      console.error(`Error checking pool ${token0.symbol}/${token1.symbol} ${fee}:`, e);
    }
  }
};

export default useTokenPairPools;