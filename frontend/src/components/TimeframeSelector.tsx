import React from 'react'

interface TimeframeSelectorProps {
  selectedTimeframe: string
  onTimeframeChange: (timeframe: string) => void
}

const timeframes = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
]

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selectedTimeframe,
  onTimeframeChange,
}) => {
  return (
    <div className="flex space-x-1 bg-dark-800 rounded-lg p-1">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe.value}
          onClick={() => onTimeframeChange(timeframe.value)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            selectedTimeframe === timeframe.value
              ? 'bg-primary-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  )
} 