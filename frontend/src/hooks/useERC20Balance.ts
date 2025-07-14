import { useContractRead } from 'wagmi';
import { erc20Abi } from 'viem';

export function useERC20Balance(tokenAddress: `0x${string}` | undefined, userAddress: `0x${string}` | undefined) {
  return useContractRead({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: tokenAddress && userAddress ? [userAddress] : undefined,
    enabled: !!tokenAddress && !!userAddress,
    watch: true, // auto-refresh on new blocks
  });
} 