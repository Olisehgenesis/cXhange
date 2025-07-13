import React from 'react'
import { ChevronDown } from 'lucide-react'
import { TradingPair } from '../types/api'

interface PairSelectorProps {
  pairs: TradingPair[]
  selectedPair: string
  onPairChange: (pair: string) => void
  isLoading?: boolean
}

export const PairSelector: React.FC<PairSelectorProps> = ({
  pairs,
  selectedPair,
  onPairChange,
  isLoading = false
}) => {
  return (
    <div className="relative">
      <select
        value={selectedPair}
        onChange={(e) => onPairChange(e.target.value)}
        disabled={isLoading}
        className="appearance-none bg-dark-800 text-white border border-gray-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
      >
        {isLoading ? (
          <option>Loading pairs...</option>
        ) : (
          <>
            <option value="">Select a trading pair</option>
            {pairs.map((pair) => (
              <option key={pair.pair} value={pair.pair}>
                {pair.token_in_symbol}/{pair.token_out_symbol}
              </option>
            ))}
          </>
        )}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
    </div>
  )
} 