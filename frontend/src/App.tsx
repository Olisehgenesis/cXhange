import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { PairSelector } from './components/PairSelector'
import { TimeframeSelector } from './components/TimeframeSelector'
import { DynamicCandlestickChart } from './components/DynamicCandlestickChart'
import { useTradingPairs } from './hooks/useApi'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

function TradingApp() {
  const [selectedPair, setSelectedPair] = useState('cUSD_cCELO')
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m')
  const [latestPrice, setLatestPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isPriceUp, setIsPriceUp] = useState<boolean>(true)

  const { data: pairs = [], isLoading: pairsLoading, error: pairsError } = useTradingPairs()

  // Handle errors
  const hasPairsError = pairsError !== null && pairsError !== undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            C-Switch Trading Platform
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Real-time price charts for Celo's Mento protocol with live market data
          </p>
        </header>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Controls */}
          <div className="card">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Trading Pair
                </label>
                <PairSelector
                  pairs={pairs}
                  selectedPair={selectedPair}
                  onPairChange={setSelectedPair}
                  isLoading={pairsLoading}
                />
                {hasPairsError && (
                  <p className="text-red-400 text-sm mt-2">
                    Error loading pairs. Please try again.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Timeframe
                </label>
                <TimeframeSelector
                  selectedTimeframe={selectedTimeframe}
                  onTimeframeChange={setSelectedTimeframe}
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <DynamicCandlestickChart
            pair={selectedPair}
            timeframe={selectedTimeframe}
            onPriceUpdate={(price, change) => {
              setLatestPrice(price)
              setPriceChange(change)
              setIsPriceUp(change >= 0)
            }}
          />

          {/* Market Info */}
          {selectedPair && latestPrice !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Latest Price</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-white">
                    ${latestPrice.toFixed(6)}
                  </p>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    isPriceUp ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                  }`}>
                    {isPriceUp ? '+' : ''}{priceChange.toFixed(6)}
                  </span>
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Pair</h3>
                <p className="text-2xl font-bold text-blue-400">
                  {selectedPair.replace('_', '/')}
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Timeframe</h3>
                <p className="text-2xl font-bold text-purple-400">
                  {selectedTimeframe}
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-2xl font-bold text-green-400">
                    LIVE
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingApp />
    </QueryClientProvider>
  )
}

export default App 