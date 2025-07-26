import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { PoolDisplay } from '../hooks/useTokenPairPools';
import { useUniswapV4Minting, MintPositionParams, calculateOptimalTickRange } from '../hooks/useUniswapV4Minting';

interface MintPositionModalProps {
  pool: PoolDisplay;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const MintPositionModal: React.FC<MintPositionModalProps> = ({
  pool,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [tickLower, setTickLower] = useState('');
  const [tickUpper, setTickUpper] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isFullRange, setIsFullRange] = useState(false);
  const [rangePercentage, setRangePercentage] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { mintPosition, isMinting, error, resetError } = useUniswapV4Minting();

  // Calculate optimal tick range when pool or range percentage changes
  useEffect(() => {
    if (isFullRange) {
      setTickLower('-887272');
      setTickUpper('887272');
    } else {
      const { tickLower: optimalLower, tickUpper: optimalUpper } = calculateOptimalTickRange(
        pool.currentTick,
        rangePercentage
      );
      setTickLower(optimalLower.toString());
      setTickUpper(optimalUpper.toString());
    }
  }, [pool.currentTick, rangePercentage, isFullRange]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount0('');
      setAmount1('');
      setSlippage('0.5');
      setIsFullRange(false);
      setRangePercentage(10);
      setShowAdvanced(false);
      resetError();
    }
  }, [isOpen, resetError]);

  const handleMint = async () => {
    if (!amount0 || !amount1) {
      return;
    }

    const mintData: MintPositionParams = {
      pool,
      amount0,
      amount1,
      tickLower: isFullRange ? -887272 : parseInt(tickLower),
      tickUpper: isFullRange ? 887272 : parseInt(tickUpper),
      slippage: parseFloat(slippage)
    };

    try {
      const result = await mintPosition(mintData);
      
      if (result.success) {
        onSuccess?.(result);
        onClose();
      }
    } catch (err) {
      console.error('Minting error:', err);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const calculatePriceRange = () => {
    if (!tickLower || !tickUpper) return { lower: 0, upper: 0 };
    
    const lower = Math.pow(1.0001, parseInt(tickLower));
    const upper = Math.pow(1.0001, parseInt(tickUpper));
    
    return { lower, upper };
  };

  const priceRange = calculatePriceRange();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Mint Position
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Pool Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex -space-x-1">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border border-white flex items-center justify-center text-xs font-bold text-white">
                {pool.token0Symbol.charAt(0)}
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-teal-500 rounded-full border border-white flex items-center justify-center text-xs font-bold text-white">
                {pool.token1Symbol.charAt(0)}
              </div>
            </div>
            <span className="font-semibold">{pool.token0Symbol}/{pool.token1Symbol}</span>
            <span className="text-sm text-gray-500">{(pool.fee / 10000).toFixed(2)}% Fee</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Current Tick: {pool.currentTick}</div>
            <div>Pool Address: {pool.poolAddress.slice(0, 10)}...{pool.poolAddress.slice(-8)}</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Amount Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {pool.token0Symbol} Amount
            </label>
            <input
              type="number"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {pool.token1Symbol} Amount
            </label>
            <input
              type="number"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Range Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Price Range</label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isFullRange}
                onChange={(e) => setIsFullRange(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Full Range</span>
            </label>
          </div>

          {!isFullRange && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Range Percentage</label>
                <select
                  value={rangePercentage}
                  onChange={(e) => setRangePercentage(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5% (Conservative)</option>
                  <option value={10}>10% (Balanced)</option>
                  <option value={20}>20% (Aggressive)</option>
                  <option value={50}>50% (Very Aggressive)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Lower Tick</label>
                  <input
                    type="number"
                    value={tickLower}
                    onChange={(e) => setTickLower(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Upper Tick</label>
                  <input
                    type="number"
                    value={tickUpper}
                    onChange={(e) => setTickUpper(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Price Range Display */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Price Range</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{priceRange.lower.toFixed(6)}</span>
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-700">{priceRange.upper.toFixed(6)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slippage Tolerance (%)
                </label>
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  placeholder="0.5"
                  step="0.1"
                  min="0.1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Position Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Value:</span>
              <span className="font-medium">
                {formatCurrency(amount0)} {pool.token0Symbol} + {formatCurrency(amount1)} {pool.token1Symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Range:</span>
              <span className="font-medium">
                {isFullRange ? 'Full Range' : `${rangePercentage}% around current price`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Slippage:</span>
              <span className="font-medium">{slippage}%</span>
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
            onClick={handleMint}
            disabled={isMinting || !amount0 || !amount1 || (!isFullRange && (!tickLower || !tickUpper))}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isMinting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Minting...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Mint Position</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MintPositionModal; 