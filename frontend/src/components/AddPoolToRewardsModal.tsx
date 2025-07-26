import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Percent, Calendar, Zap } from 'lucide-react';
import { PoolDisplay } from '../hooks/useTokenPairPools';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import poolAbiJson from '../abis/poolAbi.json';

const poolAbi = poolAbiJson.abi;

interface AddPoolToRewardsModalProps {
  pool: PoolDisplay;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const AddPoolToRewardsModal: React.FC<AddPoolToRewardsModalProps> = ({
  pool,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [rewardAllocation, setRewardAllocation] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [multiplier, setMultiplier] = useState('100');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRewardAllocation('');
      setDurationDays('30');
      setMultiplier('100');
      setError(null);
      setIsAdding(false);
    }
  }, [isOpen]);

  const calculateRewardPerSecond = () => {
    if (!rewardAllocation || !durationDays) return 0;
    const allocation = parseFloat(rewardAllocation);
    const duration = parseFloat(durationDays);
    if (allocation <= 0 || duration <= 0) return 0;
    
    // Convert to seconds and calculate reward per second
    const durationSeconds = duration * 24 * 60 * 60;
    return allocation / durationSeconds;
  };

  const calculateAPR = () => {
    const rewardPerSecond = calculateRewardPerSecond();
    if (rewardPerSecond <= 0) return 0;
    
    try {
      // Estimate total liquidity (using Uniswap liquidity as proxy)
      const totalLiquidity = Number(formatUnits(pool.uniswapLiquidity, 18));
      if (totalLiquidity <= 0) return 0;
      
      // Annual rewards = rewardPerSecond * seconds per year * multiplier
      const annualRewards = rewardPerSecond * 31536000 * (parseFloat(multiplier) / 100);
      
      // APR = (annual rewards / total liquidity) * 100
      const apr = (annualRewards / totalLiquidity) * 100;
      return Math.max(0, apr);
    } catch {
      return 0;
    }
  };

  const handleAddPool = async () => {
    if (!rewardAllocation || !durationDays || !multiplier) {
      setError('Please fill in all fields');
      return;
    }

    if (!address || !walletClient || !publicClient) {
      setError('Please connect your wallet');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const allocation = parseUnits(rewardAllocation, 18);
      const duration = BigInt(durationDays);
      const multiplierValue = BigInt(multiplier);

      const { request } = await publicClient.simulateContract({
        address: '0xc15895836b9727157dc6accf824eeb9f2b9cd113' as `0x${string}`,
        abi: poolAbi,
        functionName: 'createRewardPool',
        args: [
          pool.token0 as `0x${string}`,
          pool.token1 as `0x${string}`,
          pool.fee,
          allocation,
          duration,
          multiplierValue
        ],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        onSuccess?.({
          success: true,
          transactionHash: hash,
          poolId: pool.id,
          poolAddress: pool.poolAddress
        });
        onClose();
      } else {
        setError('Transaction failed');
      }
    } catch (err: any) {
      console.error('Error adding pool to rewards:', err);
      setError(err.message || 'Failed to add pool to rewards');
    } finally {
      setIsAdding(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const rewardPerSecond = calculateRewardPerSecond();
  const apr = calculateAPR();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Add Pool to Rewards
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Pool Info */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {pool.token0Symbol}/{pool.token1Symbol}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Fee:</span>
              <span className="ml-2 font-medium">{pool.fee / 10000}%</span>
            </div>
            <div>
              <span className="text-gray-500">Liquidity:</span>
              <span className="ml-2 font-medium">{formatCurrency(formatUnits(pool.uniswapLiquidity, 18))}</span>
            </div>
            <div>
              <span className="text-gray-500">Pool Address:</span>
              <div className="text-xs font-mono text-gray-700 break-all mt-1">
                {pool.poolAddress}
              </div>
            </div>
          </div>
        </div>

        {/* Reward Configuration */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Reward Allocation (CELO)
            </label>
            <div className="relative">
              <input
                type="number"
                value={rewardAllocation}
                onChange={(e) => setRewardAllocation(e.target.value)}
                placeholder="1000"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                CELO
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days)
            </label>
            <div className="relative">
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="30"
                min="1"
                max="365"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reward Multiplier (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="100"
                min="50"
                max="500"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Reward Preview */}
        {rewardAllocation && durationDays && (
          <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">Reward Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Reward per Second:</span>
                <span className="font-semibold text-green-900">
                  {rewardPerSecond.toFixed(6)} CELO
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Daily Rewards:</span>
                <span className="font-semibold text-green-900">
                  {(rewardPerSecond * 86400).toFixed(2)} CELO
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Estimated APR:</span>
                <span className="font-semibold text-green-900">
                  {apr.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Total Duration:</span>
                <span className="font-semibold text-green-900">
                  {durationDays} days
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddPool}
            disabled={isAdding || !rewardAllocation || !durationDays || !multiplier}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Adding Pool...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Add Pool to Rewards</span>
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h6 className="text-sm font-medium text-yellow-800 mb-1">💡 Tips</h6>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Higher reward allocation = higher APR</li>
            <li>• Longer duration spreads rewards over time</li>
            <li>• Multiplier affects reward distribution</li>
            <li>• Consider pool liquidity when setting rewards</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddPoolToRewardsModal; 