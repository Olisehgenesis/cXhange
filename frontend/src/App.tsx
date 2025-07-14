import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { PairSelector } from './components/PairSelector'
import { TimeframeSelector } from './components/TimeframeSelector'
import { DynamicCandlestickChart } from './components/DynamicCandlestickChart'
import { useTradingPairs } from './hooks/useApi'
import { Search, TrendingUp, Globe, Shield, Zap, Wallet, User, Coins, BarChart3, Settings, X } from 'lucide-react'
import WalletConnectButton from './components/WalletConnectButton'
import { useAccount, useBalance } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import ProfilePage from './components/ProfilePage'
import { MENTO_ASSETS as assets } from './constants/mentoAssets'
import BuySellDialog from './components/BuySellDialog'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

function TradingApp() {
  const [selectedPair, setSelectedPair] = useState('CELO_cUSD')
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m')
  const [latestPrice, setLatestPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isPriceUp, setIsPriceUp] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const navigate = useNavigate();
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell' | null>(null);

  const { data: pairs = [], isLoading: pairsLoading, error: pairsError } = useTradingPairs()
  const { address, isConnected, chain } = useAccount();
  // Add state for assets


  // Helper to get asset info from assets state
  const getAssetInfo = (symbol: string) => {
    return assets.find(a => a.symbol === symbol);
  };

  // cUSD and CELO contract addresses (mainnet/alfajores)
  const cUSDBalance = useBalance({ address, token: assets.find(a => a.symbol === 'cUSD')?.address as `0x${string}`, chainId: chain?.id });
  const CELOBalance = useBalance({ address, token: assets.find(a => a.symbol === 'CELO')?.address as `0x${string}`, chainId: chain?.id });

  // Helper to get token addresses and symbols for selected pair
  const getPairTokens = () => {
    const [tokenIn, tokenOut] = selectedPair.split('_');
    return { tokenIn, tokenOut };
  };

  // Get balances for the selected pair tokens
  const { tokenIn, tokenOut } = getPairTokens();
  const tokenInAsset = getAssetInfo(tokenIn);
  const tokenOutAsset = getAssetInfo(tokenOut);
  const tokenInBalance = useBalance({ address, token: tokenInAsset?.address as `0x${string}`, chainId: chain?.id });
  const tokenOutBalance = useBalance({ address, token: tokenOutAsset?.address as `0x${string}`, chainId: chain?.id });

  // Fonbank cUSD buy link (example, update as needed)
  const fonbankLink = 'https://fonbnk.com/buy-cusd';

  // Handle errors
  const hasPairsError = pairsError !== null && pairsError !== undefined

  // Filter pairs based on search query
  const filteredPairs = pairs.filter(pair => 
    pair.token_in_symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pair.token_out_symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pair.pair.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (pairs.length > 0) {
      const celoCusd = pairs.find(
        p =>
          (p.token_in_symbol === 'CELO' && p.token_out_symbol === 'cUSD')
      )
      if (celoCusd && selectedPair !== celoCusd.pair) {
        setSelectedPair(celoCusd.pair)
      }
    }
  }, [pairs])

  const handleWalletConnect = () => {
    setIsWalletConnected(!isWalletConnected)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sand-300 via-sand-200 to-sand-100">
      {/* MiloFX Header */}
      <header className="bg-sand-100 border-b border-sand-500 shadow-milo">
        <div className="container mx-auto px-8 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-forest-500 to-forest-600 rounded-milo flex items-center justify-center shadow-milo">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-outfit font-bold text-sand-800">
                    MiloFX
                  </h1>
                  <p className="text-sand-700 font-inter text-xs">
                    Professional Multi-Currency Trading
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md lg:max-w-lg">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-sand-600 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search trading pairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-milo w-full pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-4 text-sand-700">
                <div className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span className="font-inter text-xs">Global Markets</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4" />
                  <span className="font-inter text-xs">Secure Trading</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span className="font-inter text-xs">Real-time Data</span>
                </div>
              </div>
              
              {/* Wallet Connect Button */}
              <WalletConnectButton />
              <Link to="/profile" className="p-2 rounded-full hover:bg-sand-200 transition-colors border border-sand-300 ml-2" aria-label="Profile">
                <User className="w-4 h-4 text-sand-700" />
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Market Details */}
        <div className="w-72 bg-sand-100 border-r border-sand-500 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Market Overview */}
            <div className="card-secondary">
              <h2 className="text-lg font-outfit font-bold text-sand-800 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Market Overview
              </h2>
              
              {latestPrice !== null && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sand-700 font-inter text-sm">Current Price</p>
                    <p className="text-2xl font-outfit font-bold text-sand-800">
                      ${latestPrice.toFixed(6)}
                    </p>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                      isPriceUp ? 'status-success' : 'status-error'
                    }`}>
                      {isPriceUp ? '+' : ''}{priceChange.toFixed(6)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Market Stats */}
            {selectedPair && latestPrice !== null && (
              <div className="card-secondary">
                <h3 className="text-base font-outfit font-semibold text-sand-800 mb-4">Market Stats</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sand-700 font-inter text-sm">Trading Pair</span>
                    <span className="font-outfit font-semibold text-forest-500 text-sm">
                      {selectedPair.replace('_', '/')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sand-700 font-inter text-sm">Timeframe</span>
                    <span className="font-outfit font-semibold text-rust-500 text-sm">
                      {selectedTimeframe}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sand-700 font-inter text-sm">Status</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-forest-500 rounded-full animate-pulse"></div>
                      <span className="font-outfit font-semibold text-forest-500 text-sm">LIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Platform Stats */}
            <div className="card-secondary">
              <h3 className="text-base font-outfit font-semibold text-sand-800 mb-4">Platform Stats</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sand-700 font-inter text-sm">Active Pairs</span>
                  <span className="font-outfit font-semibold text-forest-500 text-sm">{pairs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sand-700 font-inter text-sm">Update Rate</span>
                  <span className="font-outfit font-semibold text-rust-500 text-sm">5s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sand-700 font-inter text-sm">Platform</span>
                  <span className="font-outfit font-semibold text-sand-700 text-sm">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Chart with Trading Controls */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Trading Controls Bar */}
          <div className="bg-sand-50 border-b border-sand-500 p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-outfit font-bold text-sand-800">
                    {selectedPair.replace('_', '/')}
                  </h2>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isPriceUp ? 'status-success' : 'status-error'
                  }`}>
                    {isPriceUp ? '+' : ''}{priceChange.toFixed(6)}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-xs font-medium text-milo-secondary mb-1">
                      Trading Pair
                    </label>
                    <div className="w-48">
                      <PairSelector
                        pairs={filteredPairs}
                        selectedPair={selectedPair}
                        onPairChange={setSelectedPair}
                        isLoading={pairsLoading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-milo-secondary mb-1">
                      Timeframe
                    </label>
                    <TimeframeSelector
                      selectedTimeframe={selectedTimeframe}
                      onTimeframeChange={setSelectedTimeframe}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="btn-primary text-sm px-4 py-2" onClick={() => { setTradeAction('buy'); setTradeDialogOpen(true); }}>
                  Buy {selectedPair.split('_')[0]}
                </button>
                <button className="btn-secondary text-sm px-4 py-2" onClick={() => { setTradeAction('sell'); setTradeDialogOpen(true); }}>
                  Sell {selectedPair.split('_')[0]}
                </button>
                <button className="p-2 text-sand-600 hover:text-sand-800 hover:bg-sand-200 rounded-milo transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {hasPairsError && (
              <p className="text-burgundy-500 text-sm mt-2">
                Error loading pairs. Please try again.
              </p>
            )}
          </div>

          {/* Chart Area */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="h-full">
              <DynamicCandlestickChart
                pair={selectedPair}
                timeframe={selectedTimeframe}
                onPriceUpdate={(price, change) => {
                  setLatestPrice(price)
                  setPriceChange(change)
                  setIsPriceUp(change >= 0)
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - User Assets */}
        <div className="w-72 bg-sand-100 border-l border-sand-500 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* User Profile */}
            <div className="card-secondary">
              <h2 className="text-lg font-outfit font-bold text-sand-800 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                User Profile
              </h2>
              
              <div className="text-center">
                {isWalletConnected ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 bg-forest-100 rounded-full flex items-center justify-center mx-auto">
                      <User className="w-7 h-7 text-forest-500" />
                    </div>
                    <div>
                      <p className="font-outfit font-semibold text-sand-800 text-sm">Connected Wallet</p>
                      <p className="text-sand-700 font-inter text-xs">0x1234...5678</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 bg-sand-200 rounded-full flex items-center justify-center mx-auto">
                      <User className="w-7 h-7 text-sand-600" />
                    </div>
                    <p className="text-sand-700 font-inter text-sm">Wallet not connected</p>
                  </div>
                )}
              </div>
            </div>

            {/* Portfolio Overview */}
            <div className="card">
              <h3 className="text-base font-outfit font-semibold text-sand-800 mb-4 flex items-center">
                <Coins className="w-5 h-5 mr-2" />
                Portfolio
              </h3>
              
              {isConnected ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sand-700 font-inter text-sm">Wallet Address</p>
                    <p className="text-xs font-mono text-sand-600">{address && `${address.slice(0, 6)}...${address.slice(-4)}`}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-sand-50 rounded-milo">
                      <span className="text-sand-700 font-inter text-sm">cUSD</span>
                      <span className="font-outfit font-semibold text-sand-800 text-sm">
                        {cUSDBalance.isLoading ? 'Loading...' : cUSDBalance.data ? parseFloat(cUSDBalance.data.formatted).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-sand-50 rounded-milo">
                      <span className="text-sand-700 font-inter text-sm">CELO</span>
                      <span className="font-outfit font-semibold text-sand-800 text-sm">
                        {CELOBalance.isLoading ? 'Loading...' : CELOBalance.data ? parseFloat(CELOBalance.data.formatted).toFixed(4) : '0.0000'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Coins className="w-10 h-10 text-sand-400 mx-auto mb-3" />
                  <p className="text-sand-700 font-inter text-sm">Connect wallet to view portfolio</p>
                </div>
              )}
            </div>

            {/* Recent Trades */}
            <div className="card-secondary">
              <h3 className="text-base font-outfit font-semibold text-sand-800 mb-4">Recent Trades</h3>
              
              {isWalletConnected ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-sand-50 rounded-milo">
                    <div>
                      <p className="font-outfit font-medium text-sand-800 text-sm">Buy CELO</p>
                      <p className="text-sand-600 font-inter text-xs">2 hours ago</p>
                    </div>
                    <span className="font-outfit font-semibold text-forest-500 text-sm">+$1,234</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-sand-50 rounded-milo">
                    <div>
                      <p className="font-outfit font-medium text-sand-800 text-sm">Sell cUSD</p>
                      <p className="text-sand-600 font-inter text-xs">5 hours ago</p>
                    </div>
                    <span className="font-outfit font-semibold text-burgundy-500 text-sm">-$567</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sand-700 font-inter text-sm">No recent trades</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-base font-outfit font-semibold text-sand-800 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button 
                  className="w-full btn-primary text-sm py-2"
                  onClick={() => { setTradeAction('buy'); setTradeDialogOpen(true); }}
                >
                  Buy {selectedPair.split('_')[0]}
                </button>
                <button 
                  className="w-full btn-secondary text-sm py-2"
                  onClick={() => { setTradeAction('sell'); setTradeDialogOpen(true); }}
                >
                  Sell {selectedPair.split('_')[0]}
                </button>
                <button className="w-full btn-accent text-sm py-2">
                  View History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Trade Dialog */}
      <BuySellDialog
        open={tradeDialogOpen}
        onClose={() => setTradeDialogOpen(false)}
        action={tradeAction}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        address={address}
        isConnected={!!isConnected}
        fonbankLink={fonbankLink}
      />
      <footer className="bg-sand-100 border-t border-sand-500 shadow-milo text-sand-700 text-sm font-inter py-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-8 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-forest-500 to-forest-600 rounded-milo flex items-center justify-center shadow-milo">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit font-bold text-sand-800 text-lg">MiloFX</span>
          </div>
          <div className="flex flex-wrap gap-6 items-center">
            <a href="/" className="hover:text-forest-500 transition-colors">Home</a>
            <a href="/profile" className="hover:text-forest-500 transition-colors">Profile</a>
            <a href="https://milofx.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-forest-500 transition-colors">About</a>
            <a href="mailto:support@milofx.xyz" className="hover:text-forest-500 transition-colors">Support</a>
          </div>
          <div className="text-xs text-sand-600 mt-2 md:mt-0">&copy; {new Date().getFullYear()} MiloFX. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<TradingApp />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App 