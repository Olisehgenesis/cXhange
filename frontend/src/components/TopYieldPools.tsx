import React from 'react';
import { formatUnits } from 'viem';
import { TrendingUp, Trophy, Star, Percent } from 'lucide-react';
import { PoolDisplay } from '../hooks/useTokenPairPools';

interface TopYieldPoolsProps {
  pools: PoolDisplay[];
  maxDisplay?: number;
}

const TopYieldPools: React.FC<TopYieldPoolsProps> = ({ pools, maxDisplay = 3 }) => {
  // Calculate APR for each pool and get top yielders
  const calculateAPR = (pool: PoolDisplay) => {
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

  const poolsWithAPR = pools
    .filter(pool => pool.alreadyAdded)
    .map(pool => ({
      ...pool,
      apr: calculateAPR(pool)
    }))
    .filter(pool => pool.apr > 0)
    .sort((a, b) => b.apr - a.apr)
    .slice(0, maxDisplay);

  if (poolsWithAPR.length === 0) {
    return null;
  }

  const formatLiquidity = (liquidity: bigint) => {
    if (liquidity === 0n) return '0';
    const formatted = formatUnits(liquidity, 18);
    const num = parseFloat(formatted);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg border border-yellow-200 mb-8">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Top Yielding Pools</h3>
          <p className="text-sm text-gray-600">Highest APR opportunities</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {poolsWithAPR.map((pool, index) => (
          <div 
            key={pool.id} 
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                {index === 1 && <Star className="h-4 w-4 text-gray-400" />}
                {index === 2 && <Star className="h-4 w-4 text-orange-400" />}
                <span className="text-sm font-medium text-gray-700">
                  #{index + 1}
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full">
                <Percent className="h-3 w-3" />
                <span className="text-xs font-bold">{pool.apr.toFixed(2)}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-gray-900">
                {pool.token0Symbol}/{pool.token1Symbol}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>TVL:</span>
                  <span className="font-medium">{formatLiquidity(pool.totalLiquidity)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Multiplier:</span>
                  <span className="font-medium">{pool.multiplier / 100}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee:</span>
                  <span className="font-medium">{pool.fee / 10000}%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <a
                href={`https://app.uniswap.org/explore/pools/celo/${pool.poolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-xs"
              >
                <TrendingUp className="h-3 w-3" />
                <span>View Pool</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {poolsWithAPR.length > 0 && (
        <div className="mt-4 pt-4 border-t border-yellow-200">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Average APR: <span className="font-semibold text-green-600">
                {(poolsWithAPR.reduce((sum, pool) => sum + pool.apr, 0) / poolsWithAPR.length).toFixed(2)}%
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopYieldPools; 