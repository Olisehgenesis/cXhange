import React, { useState, useEffect } from 'react';
import { X, Target, AlertCircle, CheckCircle, Loader2, Info, TrendingUp, Wallet, Percent } from 'lucide-react';
import { PoolDisplay } from '../hooks/useTokenPairPools';
import { parseUnits, formatUnits } from 'viem';

interface StakingModalProps {
  pool: PoolDisplay;
  isOpen: boolean;
  onClose: () => void;
  onStake: (pool: PoolDisplay, token: string, amount: string) => Promise<void>;
  isStaking?: boolean;
  error?: string | null;
}

const StakingModal: React.FC<StakingModalProps> = ({
  pool,
  isOpen,
  onClose,
  onStake,
  isStaking = false,
  error = null
}) => {
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(pool.token0Symbol);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedRewards, setEstimatedRewards] = useState(0);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStakeAmount('');
      setSelectedToken(pool.token0Symbol);
      setShowAdvanced(false);
      setEstimatedRewards(0);
    }
  }, [isOpen, pool.token0Symbol]);

  // Calculate estimated rewards based on amount and pool APR
  useEffect(() => {
    if (stakeAmount && parseFloat(stakeAmount) > 0) {
      const amount = parseFloat(stakeAmount);
      const apr = calculatePoolAPR();
      const estimatedDaily = (amount * apr) / 365;
      setEstimatedRewards(estimatedDaily);
    } else {
      setEstimatedRewards(0);
    }
  }, [stakeAmount, pool]);

  const calculatePoolAPR = () => {
    if (!pool.alreadyAdded || pool.rewardPerSecond === 0n || pool.totalLiquidity === 0n) {
      return 0;
    }
    
    try {
      const rewardPerSecond = Number(formatUnits(pool.rewardPerSecond, 18));
      const totalLiquidity = Number(formatUnits(pool.totalLiquidity, 18));
      const multiplier = pool.multiplier || 100;
      const annualRewards = rewardPerSecond * 31536000 * (multiplier / 100);
      const apr = totalLiquidity > 0 ? (annualRewards / totalLiquidity) * 100 : 0;
      return Math.max(0, apr);
    } catch {
      return 0;
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      return;
    }

    try {
      await onStake(pool, selectedToken, stakeAmount);
      onClose();
    } catch (err) {
      console.error('Staking error:', err);
    }
  };

  const getTokenDecimals = () => {
    return selectedToken === pool.token0Symbol ? pool.token0Decimals : pool.token1Decimals;
  };

  const getTokenAddress = () => {
    return selectedToken === pool.token0Symbol ? pool.token0 : pool.token1;
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const poolAPR = calculatePoolAPR();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Stake to Earn Rewards
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Pool Info */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6 border border-green-200">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex -space-x-1">
              <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full border border-white flex items-center justify-center text-xs font-bold text-white">
                {pool.token0Symbol.charAt(0)}
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border border-white flex items-center justify-center text-xs font-bold text-white">
                {pool.token1Symbol.charAt(0)}
              </div>
            </div>
            <span className="font-semibold">{pool.token0Symbol}/{pool.token1Symbol}</span>
            <span className="text-sm text-gray-500">{(pool.fee / 10000).toFixed(2)}% Fee</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Pool APR: <span className="font-semibold text-green-600">{poolAPR.toFixed(2)}%</span></div>
            <div>Multiplier: <span className="font-semibold">{pool.multiplier / 100}x</span></div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Token Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Token to Stake
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedToken(pool.token0Symbol)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedToken === pool.token0Symbol
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                  {pool.token0Symbol.charAt(0)}
                </div>
                <div className="font-medium">{pool.token0Symbol}</div>
                <div className="text-xs text-gray-500">Token 0</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedToken(pool.token1Symbol)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedToken === pool.token1Symbol
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-teal-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                  {pool.token1Symbol.charAt(0)}
                </div>
                <div className="font-medium">{pool.token1Symbol}</div>
                <div className="text-xs text-gray-500">Token 1</div>
              </div>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Stake ({selectedToken})
          </label>
          <div className="relative">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.0"
              step="0.000001"
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {selectedToken}
            </div>
          </div>
        </div>

        {/* Estimated Rewards */}
        {stakeAmount && parseFloat(stakeAmount) > 0 && (
          <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">Estimated Rewards</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Daily Rewards:</span>
                <span className="font-semibold text-green-900">
                  {estimatedRewards.toFixed(6)} {selectedToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Weekly Rewards:</span>
                <span className="font-semibold text-green-900">
                  {(estimatedRewards * 7).toFixed(6)} {selectedToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Monthly Rewards:</span>
                <span className="font-semibold text-green-900">
                  {(estimatedRewards * 30).toFixed(6)} {selectedToken}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <Info className="h-4 w-4" />
            <span>Advanced Settings</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-600">Token Address:</span>
                  <div className="font-mono text-gray-800 break-all">
                    {getTokenAddress()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Decimals:</span>
                  <span className="font-medium">{getTokenDecimals()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Pool ID:</span>
                  <span className="font-mono">{pool.id}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Staking Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Token:</span>
              <span className="font-medium">{selectedToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">
                {formatCurrency(stakeAmount)} {selectedToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pool APR:</span>
              <span className="font-medium text-green-600">{poolAPR.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reward Multiplier:</span>
              <span className="font-medium">{pool.multiplier / 100}x</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isStaking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Staking...</span>
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                <span>Stake {formatCurrency(stakeAmount)} {selectedToken}</span>
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h6 className="text-sm font-medium text-yellow-800 mb-1">💡 Staking Tips</h6>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Higher APR pools offer better rewards</li>
            <li>• You can unstake anytime (subject to lock periods)</li>
            <li>• Rewards are distributed continuously</li>
            <li>• Consider gas costs when staking small amounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StakingModal; 