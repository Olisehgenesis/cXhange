import { useContractRead, useContractWrite } from 'wagmi';
import { erc20Abi } from 'viem';

interface UseERC20AllowanceProps {
  token: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
}

export function useERC20Allowance({ token, owner, spender }: UseERC20AllowanceProps) {
  // Read current allowance
  const {
    data: allowance,
    isLoading: isAllowanceLoading,
    error: allowanceError,
    refetch: refetchAllowance,
  } = useContractRead({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
    enabled: !!token && !!owner && !!spender,
    watch: true,
  });

  // Approve function
  const {
    write: approve,
    data: approveTx,
    isLoading: isApproving,
    error: approveError,
  } = useContractWrite({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
  });

  // The UI can use approveTx?.hash to poll for confirmation if needed

  return {
    allowance,
    isAllowanceLoading,
    allowanceError,
    approve,
    approveTx,
    isApproving,
    approveError,
    refetchAllowance,
  };
} 