import React from 'react'

interface TimeframeSelectorProps {
  selectedTimeframe: string
  onTimeframeChange: (timeframe: string) => void
}

const timeframes = [
  { value: '10s', label: '10s' },
  { value: '30s', label: '30s' },
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
    <div className="flex space-x-1 bg-dark-800 rounded-lg p-1 border border-gray-600">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe.value}
          onClick={() => onTimeframeChange(timeframe.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            selectedTimeframe === timeframe.value
              ? 'bg-primary-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  )
} 