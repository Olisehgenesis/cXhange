import React, { useEffect, useRef } from 'react'
import { Candle, LiveCandle } from '../types/api'

interface SimpleCandlestickChartProps {
  data: Candle[]
  liveCandle?: LiveCandle | null
  pair: string
  timeframe: string
  isLoading?: boolean
}

export const SimpleCandlestickChart: React.FC<SimpleCandlestickChartProps> = ({
  data,
  liveCandle,
  pair,
  timeframe,
  isLoading = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  console.log('🎯 Simple Candlestick Chart rendered:', {
    pair,
    timeframe,
    dataLength: data.length,
    hasLiveCandle: !!liveCandle
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Process data
    let allData = [...data]
    if (liveCandle) {
      const existingIndex = allData.findIndex(candle => 
        new Date(candle.timestamp).getTime() === new Date(liveCandle.timestamp).getTime()
      )
      
      if (existingIndex >= 0) {
        allData[existingIndex] = {
          ...allData[existingIndex],
          open_price: liveCandle.open_price,
          high_price: liveCandle.high_price,
          low_price: liveCandle.low_price,
          close_price: liveCandle.close_price,
        }
      } else {
        allData.push({
          id: 0,
          pair: liveCandle.pair,
          timeframe: liveCandle.timeframe,
          open_price: liveCandle.open_price,
          high_price: liveCandle.high_price,
          low_price: liveCandle.low_price,
          close_price: liveCandle.close_price,
          volume: liveCandle.volume,
          trades: liveCandle.trades,
          timestamp: liveCandle.timestamp,
          created_at: liveCandle.last_update,
          updated_at: liveCandle.last_update
        })
      }
    }

    if (allData.length === 0) return

    // Sort by timestamp
    allData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Calculate price range
    const prices = allData.flatMap(candle => [
      parseFloat(candle.open_price),
      parseFloat(candle.high_price),
      parseFloat(candle.low_price),
      parseFloat(candle.close_price)
    ])
    
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    // Chart dimensions
    const padding = 40
    const chartWidth = canvas.width - 2 * padding
    const chartHeight = canvas.height - 2 * padding
    const candleWidth = Math.max(2, chartWidth / allData.length - 2)
    const candleSpacing = chartWidth / allData.length

    // Draw grid
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, canvas.height - padding)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvas.width - padding, y)
      ctx.stroke()
    }

    ctx.setLineDash([])

    // Draw price labels
    ctx.fillStyle = '#d1d5db'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i
      const y = padding + (chartHeight / 5) * i
      ctx.fillText(price.toFixed(6), padding - 10, y + 4)
    }

    // Draw candlesticks
    allData.forEach((candle, index) => {
      const open = parseFloat(candle.open_price)
      const high = parseFloat(candle.high_price)
      const low = parseFloat(candle.low_price)
      const close = parseFloat(candle.close_price)

      const x = padding + index * candleSpacing + candleSpacing / 2
      const isGreen = close >= open

      // Calculate Y positions
      const highY = padding + ((maxPrice - high) / priceRange) * chartHeight
      const lowY = padding + ((maxPrice - low) / priceRange) * chartHeight
      const openY = padding + ((maxPrice - open) / priceRange) * chartHeight
      const closeY = padding + ((maxPrice - close) / priceRange) * chartHeight

      // Draw wick
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body
      const bodyHeight = Math.max(1, Math.abs(closeY - openY))
      const bodyY = Math.min(openY, closeY)
      
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444'
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)

      // Draw border
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444'
      ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
    })

    // Draw title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${pair} - ${timeframe}`, canvas.width / 2, 20)

    // Draw data count
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(`${allData.length} candles`, canvas.width - 10, canvas.height - 10)

  }, [data, liveCandle, pair, timeframe])

  if (isLoading) {
    return (
      <div className="card h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <div className="text-gray-300">Loading chart data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-xl font-bold">
          {pair} - {timeframe}
        </h3>
        <div className="text-gray-400 text-sm bg-gray-700 px-3 py-1 rounded-full">
          {data.length} candles
        </div>
      </div>
      
      <div className="w-full h-96 relative">
        {data.length > 0 || liveCandle ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-gray-800 border border-gray-600 rounded"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                No Data Available
              </h3>
              <p className="text-gray-400">
                Select a trading pair to view the chart
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 