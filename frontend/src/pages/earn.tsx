import React, { useState, useMemo } from 'react';
import { formatUnits } from 'viem';
import useTokenPairPools from '../hooks/useTokenPairPools';
import PoolCard from '../components/PoolCard';
import PoolCardSkeleton from '../components/PoolCardSkeleton';
import TopYieldPools from '../components/TopYieldPools';
import AddPoolToRewardsModal from '../components/AddPoolToRewardsModal';
import { 
  Search, 
  Filter, 
  Zap, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  BarChart3,
  Globe,
  Shield,
  Percent
} from 'lucide-react';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-red-200 max-w-md w-full">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Something went wrong</h2>
            <p className="text-gray-600 text-center mb-4">We encountered an error while loading the pools.</p>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg font-mono whitespace-pre-wrap">
              {this.state.error?.toString()}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const EarnPage = () => {
  const { loading, error, pools, supportedTokens, isDiscovering } = useTokenPairPools();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'available'>('all');
  const [sortBy, setSortBy] = useState<'liquidity' | 'rewards' | 'name' | 'apr'>('liquidity');
  const [showAddPoolModal, setShowAddPoolModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<any>(null);

  // Filter and sort pools
  const filteredAndSortedPools = useMemo(() => {
    let filtered = pools;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pool => 
        pool.token0Symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pool.token1Symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${pool.token0Symbol}/${pool.token1Symbol}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType === 'active') {
      filtered = filtered.filter(pool => pool.alreadyAdded);
    } else if (filterType === 'available') {
      filtered = filtered.filter(pool => !pool.alreadyAdded);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'liquidity':
          return b.uniswapLiquidity > a.uniswapLiquidity ? 1 : b.uniswapLiquidity < a.uniswapLiquidity ? -1 : 0;
        case 'rewards':
          return b.rewardPerSecond > a.rewardPerSecond ? 1 : b.rewardPerSecond < a.rewardPerSecond ? -1 : 0;
        case 'apr':
          // Calculate APR for sorting
          const calculateAPR = (pool: any) => {
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
          const aprA = calculateAPR(a);
          const aprB = calculateAPR(b);
          return aprB - aprA;
        case 'name':
          return `${a.token0Symbol}/${a.token1Symbol}`.localeCompare(`${b.token0Symbol}/${b.token1Symbol}`);
        default:
          return 0;
      }
    });

    return filtered;
  }, [pools, searchTerm, filterType, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const activePools = pools.filter(p => p.alreadyAdded);
    const availablePools = pools.filter(p => !p.alreadyAdded);
    const totalLiquidity = pools.reduce((sum, p) => sum + p.uniswapLiquidity, 0n);
    const totalRewards = activePools.reduce((sum, p) => sum + p.rewardPerSecond, 0n);

    // Calculate average APR
    const calculateAPR = (pool: any) => {
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

    const aprs = activePools.map(calculateAPR).filter(apr => apr > 0);
    const averageAPR = aprs.length > 0 ? aprs.reduce((sum, apr) => sum + apr, 0) / aprs.length : 0;
    const maxAPR = aprs.length > 0 ? Math.max(...aprs) : 0;

    return {
      totalPools: pools.length,
      activePools: activePools.length,
      availablePools: availablePools.length,
      totalLiquidity,
      totalRewards,
      averageAPR,
      maxAPR
    };
  }, [pools]);

  const handleAddToRewards = (pool: any) => {
    setSelectedPool(pool);
    setShowAddPoolModal(true);
  };

  const handleAddPoolSuccess = (result: any) => {
    console.log('Pool added to rewards successfully:', result);
    // Optionally refresh the pools data or show a success message
    // You could also update the local state to reflect the change
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
       
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Discovering Token Pools</h2>
            <p className="text-gray-600">Scanning the Celo blockchain for available liquidity pools...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-8">
      
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-red-200 max-w-md w-full">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Error Loading Pools</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
       
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MiloFX Pool Discovery</h1>
                  <p className="text-gray-600 flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Globe className="h-4 w-4" />
                      <span>{supportedTokens.length} supported tokens</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <BarChart3 className="h-4 w-4" />
                      <span>{stats.totalPools} pools discovered</span>
                    </span>
                  </p>
                </div>
              </div>
              
              {isDiscovering && (
                <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Discovering more pools...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pools</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPools}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Pools</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activePools}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Available Pools</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.availablePools}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Supported Tokens</p>
                  <p className="text-2xl font-bold text-gray-900">{supportedTokens.length}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg APR</p>
                  <p className="text-2xl font-bold text-green-600">{stats.averageAPR.toFixed(2)}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Percent className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pools by token name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Pools</option>
                  <option value="active">Active Pools</option>
                  <option value="available">Available Pools</option>
                </select>
              </div>
              
              {/* Sort */}
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="liquidity">Sort by Liquidity</option>
                  <option value="apr">Sort by APR</option>
                  <option value="rewards">Sort by Rewards</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
            </div>
          </div>

          {/* Top Yielding Pools */}
          <TopYieldPools pools={pools} maxDisplay={3} />

          {/* Supported Tokens */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Tokens</h3>
            <div className="flex flex-wrap gap-2">
              {supportedTokens.map((token) => (
                <div
                  key={token.address}
                  className="inline-flex items-center px-3 py-2 rounded-xl text-sm bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  {token.symbol}
                </div>
              ))}
            </div>
          </div>

          {/* Pools Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Discovered Pools ({filteredAndSortedPools.length})
              </h2>
              {isDiscovering && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Discovering more pools...</span>
                </div>
              )}
            </div>

            {filteredAndSortedPools.length === 0 && !isDiscovering ? (
              <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20">
                <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500 text-lg mb-2">
                  {searchTerm ? 'No pools match your search' : 'No pools discovered yet'}
                </div>
                <div className="text-gray-400">
                  {searchTerm ? 'Try adjusting your search terms' : 'Pools will appear here as they are discovered'}
              </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedPools.map((pool) => (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    onAddToRewards={handleAddToRewards}
                    isDiscovering={isDiscovering}
                  />
                ))}
                
                {/* Show skeleton cards while discovering */}
                {isDiscovering && Array.from({ length: 3 }).map((_, index) => (
                  <PoolCardSkeleton key={`skeleton-${index}`} />
                  ))}
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Add Pool to Rewards Modal */}
      {selectedPool && (
        <AddPoolToRewardsModal
          pool={selectedPool}
          isOpen={showAddPoolModal}
          onClose={() => {
            setShowAddPoolModal(false);
            setSelectedPool(null);
          }}
          onSuccess={handleAddPoolSuccess}
        />
      )}
    </ErrorBoundary>
  );
};

export default EarnPage; 