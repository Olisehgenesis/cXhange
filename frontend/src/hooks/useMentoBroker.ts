import { useEffect, useState } from 'react';
import { usePublicClient,  useChainId } from 'wagmi';

import cXchangeArtifact from '../abis/cXchangev4.json';

// Read contract addresses from environment variables
const CXCHANGE_ADDRESSES: Record<number, string | undefined> = {
  44787: import.meta.env.VITE_CXCHANGE_ADDRESS_ALFAJORES, // Alfajores
  42220: import.meta.env.VITE_CXCHANGE_ADDRESS_MAINNET,   // Celo mainnet (example chainId)
};

const cXchangeAbi = (cXchangeArtifact as any).abi;

export function useCXchangeGetAmountOut({
  tokenIn,
  tokenOut,
  amountIn,
  enabled = true,
}: {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  enabled?: boolean;
}) {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [data, setData] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!enabled || !chainId || !publicClient) return;
    const address = CXCHANGE_ADDRESSES[chainId] as `0x${string}`;
    if (!address) return;
    setLoading(true);
    setError(null);
    console.log('[useCXchangeGetAmountOut] Calling readContract with:', {
      address,
      abi: cXchangeAbi,
      functionName: 'getSwapQuote', // CHANGED from 'getAmountOut' to 'getSwapQuote' for cXchangev4
      args: [tokenIn, tokenOut, amountIn],
    });
    publicClient
      .readContract({
        address,
        abi: cXchangeAbi,
        functionName: 'getSwapQuote', // CHANGED from 'getAmountOut' to 'getSwapQuote'
        args: [tokenIn, tokenOut, amountIn],
      })
      .then((result) => {
        // getSwapQuote returns [amountOut, protocolFee]
        if (Array.isArray(result) && result.length > 0) {
          setData(result[0] as bigint);
        } else {
          setData(null);
        }
      })
      .catch((err) => {
        console.error('[useCXchangeGetAmountOut] readContract error:', err);
        setError(err)
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [tokenIn, tokenOut, amountIn, chainId, enabled, publicClient]);

  return { data, loading, error };
}

export function useCXchangeGetExchangeRate({
  tokenIn,
  tokenOut,
  enabled = true,
}: {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  enabled?: boolean;
}) {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [data, setData] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!enabled || !chainId || !publicClient) return;
    const address = CXCHANGE_ADDRESSES[chainId] as `0x${string}`;
    if (!address) return;
    setLoading(true);
    setError(null);
    publicClient
      .readContract({
        address,
        abi: cXchangeAbi,
        functionName: 'getExchangeRate', // Update if your contract uses a different method name
        args: [tokenIn, tokenOut],
      })
      .then((result) => setData(result as bigint))
      .catch(setError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [tokenIn, tokenOut, chainId, enabled, publicClient]);

  return { data, loading, error };
} 