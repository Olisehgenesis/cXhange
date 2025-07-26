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
        className="select-milo w-full text-lg font-outfit font-medium"
      >
        {isLoading ? (
          <option className="text-sand-700">Loading pairs...</option>
        ) : (
                      <>
              {pairs.map((pair) => (
              <option key={pair.pair} value={pair.pair} className="text-sand-800">
                  {pair.token_in_symbol}/{pair.token_out_symbol}
                </option>
              ))}
            </>
        )}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sand-600 pointer-events-none" size={20} />
    </div>
  )
} 