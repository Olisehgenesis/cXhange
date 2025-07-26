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
    <div className="flex space-x-1 bg-sand-100 rounded-milo p-1 border border-sand-500">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe.value}
          onClick={() => onTimeframeChange(timeframe.value)}
          className={`px-4 py-2 rounded-md text-sm font-outfit font-medium transition-all duration-200 ${
            selectedTimeframe === timeframe.value
              ? 'bg-forest-500 text-white shadow-milo'
              : 'text-sand-700 hover:text-sand-800 hover:bg-sand-200'
          }`}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  )
} 