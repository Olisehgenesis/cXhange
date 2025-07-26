import React, { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { TrendingUp, ExternalLink, Plus, CheckCircle, Sparkles, Percent, DollarSign, Wallet, Target } from 'lucide-react';
import { PoolDisplay } from '../hooks/useTokenPairPools';
import { getTokenLogo } from '../utils/tokenLogos';
import MintPositionModal from './MintPositionModal';
import SuccessModal from './SuccessModal';
import StakingModal from './StakingModal';
import { useStaking } from '../hooks/useStaking';

interface PoolCardProps {
  pool: PoolDisplay;
  onAddToRewards?: (pool: PoolDisplay) => void;
  isDiscovering?: boolean;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, onAddToRewards, isDiscovering = false }) => {
  const [token0Logo, setToken0Logo] = useState<string | null>(null);
  const [token1Logo, setToken1Logo] = useState<string | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintResult, setMintResult] = useState<any>(null);
  const [showStakeModal, setShowStakeModal] = useState(false);

  const { stakeToPool, isStaking, error: stakingError, resetError: resetStakingError } = useStaking();

  const handleStakeToPool = async (pool: PoolDisplay, token: string, amount: string) => {
    try {
      const result = await stakeToPool({ pool, token, amount });
      if (result.success) {
        console.log('Successfully staked:', amount, token, 'to pool:', pool.id);
        setShowStakeModal(false);
      }
    } catch (err) {
      console.error('Staking failed:', err);
    }
  };

  useEffect(() => {
    const loadLogos = async () => {
      const [logo0, logo1] = await Promise.all([
        getTokenLogo(pool.token0, pool.token0Symbol),
        getTokenLogo(pool.token1, pool.token1Symbol)
      ]);
      
      setToken0Logo(logo0.logoUrl);
      setToken1Logo(logo1.logoUrl);
    };

    loadLogos();
  }, [pool.token0, pool.token1, pool.token0Symbol, pool.token1Symbol]);

  const formatLiquidity = (liquidity: bigint, decimals: number = 18) => {
    if (liquidity === 0n) return '0';
    const formatted = formatUnits(liquidity, decimals);
    const num = parseFloat(formatted);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const formatRewardRate = (rewardPerSecond: bigint, decimals: number = 18) => {
    if (rewardPerSecond === 0n) return '0';
    const formatted = formatUnits(rewardPerSecond, decimals);
    const num = parseFloat(formatted);
    return (num * 86400).toFixed(4); // Convert to daily rate
  };

  // Calculate APR based on pool data
  const calculateAPR = () => {
    if (!pool.alreadyAdded || pool.rewardPerSecond === 0n || pool.totalLiquidity === 0n) {
      return 0;
    }
    
    try {
      // Convert BigInt to Number for calculation
      const rewardPerSecond = Number(formatUnits(pool.rewardPerSecond, 18));
      const totalLiquidity = Number(formatUnits(pool.totalLiquidity, 18));
      const multiplier = pool.multiplier || 100;
      
      // Annual rewards = rewardPerSecond * seconds per year * multiplier
      const annualRewards = rewardPerSecond * 31536000 * (multiplier / 100);
      
      // APR = (annual rewards / total liquidity) * 100
      const apr = totalLiquidity > 0 ? (annualRewards / totalLiquidity) * 100 : 0;
      
      return Math.max(0, apr);
    } catch (error) {
      console.error('Error calculating APR:', error);
      return 0;
    }
  };

  const getPoolTypeColor = (token0Symbol: string, token1Symbol: string) => {
    const stablecoins = ['cUSD', 'cEUR', 'cREAL', 'USDC', 'USDT'];
    const isStablePair = stablecoins.includes(token0Symbol) && stablecoins.includes(token1Symbol);
    const hasCELO = token0Symbol === 'CELO' || token1Symbol === 'CELO';
    
    if (isStablePair) return 'from-emerald-400 to-teal-500';
    if (hasCELO) return 'from-amber-400 to-orange-500';
    return 'from-purple-400 to-pink-500';
  };

  const getPoolTypeLabel = (token0Symbol: string, token1Symbol: string) => {
    const stablecoins = ['cUSD', 'cEUR', 'cREAL', 'USDC', 'USDT'];
    const isStablePair = stablecoins.includes(token0Symbol) && stablecoins.includes(token1Symbol);
    const hasCELO = token0Symbol === 'CELO' || token1Symbol === 'CELO';
    
    if (isStablePair) return 'Stable Pair';
    if (hasCELO) return 'CELO Pair';
    return 'Exotic Pair';
  };

  const TokenLogo = ({ logoUrl, symbol, size = 32 }: { logoUrl: string | null; symbol: string; size?: number }) => (
    <div 
      className="relative rounded-full overflow-hidden border-2 border-white shadow-lg"
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={symbol}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div 
        className={`w-full h-full flex items-center justify-center text-xs font-bold text-white ${
          logoUrl ? 'hidden' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${getPoolTypeColor(pool.token0Symbol, pool.token1Symbol)})`
        }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    </div>
  );

  const apr = calculateAPR();

  return (
    <div className={`
      group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20
      hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-out
      ${isDiscovering ? 'animate-pulse' : ''}
    `}>
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl -z-10" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center -space-x-2">
            <TokenLogo logoUrl={token0Logo} symbol={pool.token0Symbol} size={40} />
            <TokenLogo logoUrl={token1Logo} symbol={pool.token1Symbol} size={40} />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">
              {pool.token0Symbol}/{pool.token1Symbol}
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-2">
              <span>{pool.fee / 10000}% fee</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3" />
                <span>{formatLiquidity(pool.uniswapLiquidity)} liquidity</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className={`
          px-3 py-1 rounded-full text-xs border
          ${pool.alreadyAdded 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200'
          }
        `}>
          {pool.alreadyAdded ? (
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>Active</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Available</span>
            </div>
          )}
        </div>
      </div>

      {/* Pool Type Badge */}
      <div className="mb-4">
        <span className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
          bg-gradient-to-r ${getPoolTypeColor(pool.token0Symbol, pool.token1Symbol)} text-white
        `}>
          {getPoolTypeLabel(pool.token0Symbol, pool.token1Symbol)}
        </span>
      </div>

      {/* APR Display - Prominent for active pools */}
      {pool.alreadyAdded && apr > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Percent className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Annual Yield</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">{apr.toFixed(2)}%</div>
              <div className="text-xs text-green-600">APR</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-gray-500 mb-1 flex items-center">
            <DollarSign className="h-3 w-3 mr-1" />
            Uniswap TVL
          </div>
          <div className="font-semibold text-gray-900">
            {formatLiquidity(pool.uniswapLiquidity)}
          </div>
        </div>
        
        {pool.alreadyAdded && (
          <>
            <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-xs text-gray-500 mb-1">Daily Rewards</div>
              <div className="font-semibold text-green-600">
                {formatRewardRate(pool.rewardPerSecond)} CELO
              </div>
            </div>
            
            <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-xs text-gray-500 mb-1">Multiplier</div>
              <div className="font-semibold text-blue-600">
                {pool.multiplier / 100}x
              </div>
            </div>
            
            <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-xs text-gray-500 mb-1">Our Liquidity</div>
              <div className="font-semibold text-gray-900">
                {formatLiquidity(pool.totalLiquidity)}
              </div>
            </div>
          </>
        )}
        
        <div className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-gray-500 mb-1">Current Tick</div>
          <div className="font-mono text-sm text-gray-900">
            {pool.currentTick}
          </div>
        </div>
      </div>

      {/* Pool Address */}
      <div className="mb-4 p-3 bg-gray-50/80 rounded-xl">
        <div className="text-xs text-gray-500 mb-1">Pool Address</div>
        <div className="text-xs font-mono text-gray-700 break-all">
          {pool.poolAddress}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <a
          href={`https://explorer.celo.org/address/${pool.poolAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="text-sm font-medium">View on Explorer</span>
        </a>
        
        {pool.alreadyAdded ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowMintModal(true)}
              className="flex items-center justify-center space-x-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Mint Position</span>
            </button>
            
            <button
              onClick={() => setShowStakeModal(true)}
              className="flex items-center justify-center space-x-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-green-600 hover:to-teal-700 transition-all duration-200"
            >
              <Target className="h-4 w-4" />
              <span>Stake to Earn</span>
            </button>
          </div>
        ) : (
          onAddToRewards && (
            <button
              onClick={() => onAddToRewards(pool)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">Stake to Earn</span>
            </button>
          )
        )}
      </div>

      {/* Loading overlay for discovering state */}
      {isDiscovering && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-blue-600 font-medium">Discovering...</span>
          </div>
        </div>
      )}

      {/* Mint Position Modal */}
      <MintPositionModal
        pool={pool}
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        onSuccess={(result) => {
          setMintResult(result);
          setShowSuccessModal(true);
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        transactionHash={mintResult?.transactionHash}
        positionId={mintResult?.positionId}
        poolSymbol={`${pool.token0Symbol}/${pool.token1Symbol}`}
        amount0={mintResult?.amount0 || '0'}
        amount1={mintResult?.amount1 || '0'}
        token0Symbol={pool.token0Symbol}
        token1Symbol={pool.token1Symbol}
      />

      {/* Staking Modal */}
      <StakingModal
        pool={pool}
        isOpen={showStakeModal}
        onClose={() => {
          setShowStakeModal(false);
          resetStakingError();
        }}
        onStake={handleStakeToPool}
        isStaking={isStaking}
        error={stakingError}
      />
    </div>
  );
};

export default PoolCard; 