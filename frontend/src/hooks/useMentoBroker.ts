import { useEffect, useState } from 'react';
import { usePublicClient,  useChainId } from 'wagmi';

import cXchangeArtifact from '../abis/cXchangeABI.json';

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
    publicClient
      .readContract({
        address,
        abi: cXchangeAbi,
        functionName: 'getAmountOut', // Update if your contract uses a different method name
        args: [tokenIn, tokenOut, amountIn],
      })
      .then((result) => setData(result as bigint))
      .catch(setError)
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