import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { PairSelector } from './components/PairSelector'
import { TimeframeSelector } from './components/TimeframeSelector'
import { TradingChart } from './components/TradingChart'
import { useTradingPairs, useCandles } from './hooks/useApi'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

function TradingApp() {
  const [selectedPair, setSelectedPair] = useState('')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')

  const { data: pairs = [], isLoading: pairsLoading } = useTradingPairs()
  const { data: candles = [], isLoading: candlesLoading } = useCandles(
    selectedPair,
    selectedTimeframe,
    100
  )

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            C-Switch Trading Platform
          </h1>
          <p className="text-gray-400 text-center">
            Real-time price charts for Celo's Mento protocol
          </p>
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trading Pair
              </label>
              <PairSelector
                pairs={pairs}
                selectedPair={selectedPair}
                onPairChange={setSelectedPair}
                isLoading={pairsLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timeframe
              </label>
              <TimeframeSelector
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={setSelectedTimeframe}
              />
            </div>
          </div>

          {/* Chart */}
          {selectedPair ? (
            <TradingChart
              data={candles}
              pair={selectedPair}
              timeframe={selectedTimeframe}
              isLoading={candlesLoading}
            />
          ) : (
            <div className="w-full h-96 bg-dark-800 rounded-lg flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <p className="text-lg mb-2">Select a trading pair to view the chart</p>
                <p className="text-sm">Available pairs: {pairs.length}</p>
              </div>
            </div>
          )}

          {/* Market Info */}
          {selectedPair && candles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Latest Price</h3>
                <p className="text-xl font-semibold">
                  ${parseFloat(candles[0]?.close_price || '0').toFixed(6)}
                </p>
              </div>
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">24h High</h3>
                <p className="text-xl font-semibold text-green-400">
                  ${Math.max(...candles.map(c => parseFloat(c.high_price))).toFixed(6)}
                </p>
              </div>
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">24h Low</h3>
                <p className="text-xl font-semibold text-red-400">
                  ${Math.min(...candles.map(c => parseFloat(c.low_price))).toFixed(6)}
                </p>
              </div>
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Volume</h3>
                <p className="text-xl font-semibold">
                  {candles.reduce((sum, c) => sum + parseFloat(c.volume), 0).toFixed(2)}
                </p>
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