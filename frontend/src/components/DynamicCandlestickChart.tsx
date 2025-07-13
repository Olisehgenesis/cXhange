import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { candlestickGenerator, DynamicCandle } from '../utils/candlestickGenerator'
import { Price } from '../types/api'

interface DynamicCandlestickChartProps {
  pair: string
  timeframe: string
  isLoading?: boolean
  onPriceUpdate?: (price: number, change: number) => void
}

type ChartType = 'candlestick' | 'line'

export const DynamicCandlestickChart: React.FC<DynamicCandlestickChartProps> = ({
  pair,
  timeframe,
  isLoading = false,
  onPriceUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [candles, setCandles] = useState<DynamicCandle[]>([])
  const [liveCandle, setLiveCandle] = useState<DynamicCandle | null>(null)
  const [chartType, setChartType] = useState<ChartType>('candlestick')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [animationOffset, setAnimationOffset] = useState(0)
  const [newCandleAnimation, setNewCandleAnimation] = useState(false)

  console.log('🎯 Dynamic Candlestick Chart rendered:', {
    pair,
    timeframe,
    candlesCount: candles.length,
    hasLiveCandle: !!liveCandle,
    chartType
  })

  // Clear previous pair data when pair changes
  useEffect(() => {
    if (pair) {
      // Clear data for all pairs except current one to free memory
      candlestickGenerator.clearAll()
      setCandles([])
      setLiveCandle(null)
      setAnimationOffset(0)
    }
  }, [pair])

  // Fetch price data and generate candles
  useEffect(() => {
    if (!pair) return

    const fetchPricesAndGenerateCandles = async () => {
      try {
        // Fetch latest prices from API
        const response = await fetch(`http://localhost:3001/api/prices/latest?pair=${pair}&limit=1000`)
        const data = await response.json()
        
        if (data.prices && Array.isArray(data.prices)) {
          // Add prices to the generator
          data.prices.forEach((price: Price) => {
            candlestickGenerator.addPrice(pair, price)
          })

          // Generate candles for the selected timeframe
          const generatedCandles = candlestickGenerator.generateCandles(pair, timeframe, 100)
          setCandles(generatedCandles)

          // Generate live candle
          const live = candlestickGenerator.generateLiveCandle(pair, timeframe)
          setLiveCandle(live)
          
          // Update price info and notify parent
          if (live && onPriceUpdate) {
            const currentPrice = live.close
            const change = previousPrice !== null ? currentPrice - previousPrice : 0
            setPreviousPrice(currentPrice)
            onPriceUpdate(currentPrice, change)
          }
        }
      } catch (error) {
        console.error('Error fetching prices:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchPricesAndGenerateCandles()

    // Set up continuous real-time updates
    const interval = setInterval(async () => {
      try {
        // Fetch new prices every 5 seconds
        const response = await fetch(`http://localhost:3001/api/prices/latest?pair=${pair}&limit=50`)
        const data = await response.json()
        
        if (data.prices && Array.isArray(data.prices)) {
          // Add new prices to the generator
          data.prices.forEach((price: Price) => {
            candlestickGenerator.addPrice(pair, price)
          })

          // Update candles
          const generatedCandles = candlestickGenerator.generateCandles(pair, timeframe, 100)
          
          // Check if we have a new candle
          const hasNewCandle = generatedCandles.length > candles.length
          if (hasNewCandle) {
            setNewCandleAnimation(true)
            setTimeout(() => setNewCandleAnimation(false), 1000)
          }
          
          setCandles(generatedCandles)

          // Update live candle
          const live = candlestickGenerator.generateLiveCandle(pair, timeframe)
          setLiveCandle(live)
          
          // Update price info and notify parent
          if (live && onPriceUpdate) {
            const currentPrice = live.close
            const change = previousPrice !== null ? currentPrice - previousPrice : 0
            setPreviousPrice(currentPrice)
            onPriceUpdate(currentPrice, change)
          }
        }
      } catch (error) {
        console.error('Error in real-time update:', error)
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [pair, timeframe, candles.length, previousPrice, onPriceUpdate])

  // Animate chart movement
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setAnimationOffset(prev => (prev + 1) % 20)
    }, 100)

    return () => clearInterval(animationInterval)
  }, [])

  // Render chart
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

    // Combine historical candles with live candle
    let allCandles = [...candles]
    if (liveCandle) {
      // Check if we already have a candle for this time period
      const existingIndex = allCandles.findIndex(candle => 
        new Date(candle.timestamp).getTime() === new Date(liveCandle.timestamp).getTime()
      )
      
      if (existingIndex >= 0) {
        // Update existing candle with live data
        allCandles[existingIndex] = liveCandle
      } else {
        // Add live candle
        allCandles.push(liveCandle)
      }
    }

    if (allCandles.length === 0) return

    // Sort by timestamp
    allCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Calculate price range
    const prices = allCandles.flatMap(candle => [candle.open, candle.high, candle.low, candle.close])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    if (priceRange === 0) return

    // Chart dimensions with animation offset
    const padding = 40
    const chartWidth = canvas.width - 2 * padding
    const chartHeight = canvas.height - 2 * padding
    const candleWidth = Math.max(2, chartWidth / allCandles.length - 2)
    const candleSpacing = chartWidth / allCandles.length

    // Draw grid with subtle animation
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    // Vertical grid lines with slight movement
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i + (animationOffset * 0.1)
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

    // Draw time labels (X-axis)
    ctx.fillStyle = '#d1d5db'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    const labelCount = Math.max(4, Math.min(8, Math.floor(allCandles.length / 6)))
    for (let i = 0; i < allCandles.length; i++) {
      if (i % Math.ceil(allCandles.length / labelCount) === 0 || i === allCandles.length - 1) {
        const x = padding + i * candleSpacing + candleSpacing / 2
        const ts = new Date(allCandles[i].timestamp)
        let label = ''
        if (timeframe === '10s' || timeframe === '30s') {
          label = ts.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
          })
        } else if (timeframe.endsWith('m') || timeframe === '1h') {
          label = ts.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
        } else {
          label = ts.toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit' 
          }) + ' ' + ts.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
        }
        ctx.fillText(label, x, canvas.height - padding + 18)
      }
    }

    if (chartType === 'candlestick') {
      // Draw candlesticks with animation
      allCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const isGreen = candle.close >= candle.open
        const isLive = candle.isLive
        const isNew = index === allCandles.length - 1 && newCandleAnimation
        const isIncreasing = candle.close >= candle.open

        // Calculate Y positions with animation for new candles
        const animationProgress = isNew ? Math.sin(Date.now() * 0.01) * 0.1 + 1 : 1
        const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight
        const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight
        const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight

        // Choose colors based on live status and animation
        const color = isLive ? (isIncreasing ? '#10b981' : '#ef4444') : (isGreen ? '#10b981' : '#ef4444')
        const borderColor = isLive ? (isIncreasing ? '#059669' : '#dc2626') : (isGreen ? '#059669' : '#dc2626')

        // Add glow effect for live candles
        if (isLive) {
          ctx.shadowColor = isIncreasing ? '#10b981' : '#ef4444'
          ctx.shadowBlur = 10
        }

        // Draw wick with animation
        ctx.strokeStyle = color
        ctx.lineWidth = isLive ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(x, highY)
        ctx.lineTo(x, lowY)
        ctx.stroke()

        // Draw body with animation
        const bodyHeight = Math.max(1, Math.abs(closeY - openY))
        const bodyY = Math.min(openY, closeY)
        
        ctx.fillStyle = color
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)

        // Draw border
        ctx.strokeStyle = borderColor
        ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)

        // Add live indicator - green for increasing, red for decreasing
        if (isLive) {
          const isIncreasing = candle.close >= candle.open
          ctx.fillStyle = isIncreasing ? '#10b981' : '#ef4444'
          ctx.beginPath()
          ctx.arc(x, highY - 10, 4, 0, 2 * Math.PI)
          ctx.fill()
        }

        // Reset shadow
        ctx.shadowBlur = 0
      })
    } else {
      // Draw line chart - ensure it's a joined curve with animation
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()

      // Draw the main line connecting all points with smooth animation
      allCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight

        if (index === 0) {
          ctx.moveTo(x, closeY)
        } else {
          ctx.lineTo(x, closeY)
        }
      })
      ctx.stroke()

      // Draw points on top of the line with animation
      allCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight
        const isLive = candle.isLive
        const isNew = index === allCandles.length - 1 && newCandleAnimation
        const isIncreasing = candle.close >= candle.open

        // Fixed point size
        const pointSize = 4

        // Draw point with different colors for live vs historical
        ctx.fillStyle = isLive ? (isIncreasing ? '#10b981' : '#ef4444') : '#3b82f6'
        ctx.beginPath()
        ctx.arc(x, closeY, pointSize, 0, 2 * Math.PI)
        ctx.fill()

        // Add border to points
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()

        // Add glow for live points
        if (isLive) {
          ctx.shadowColor = isIncreasing ? '#10b981' : '#ef4444'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(x, closeY, pointSize + 2, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      })
    }

    // Draw title with subtle animation
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    const displayPair = pair.replace('_', '/')
    ctx.fillText(`${displayPair} - ${timeframe}`, canvas.width / 2, 20)

    // Draw loading indicator only for initial load
    if (isInitialLoading) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2)
    }

  }, [candles, liveCandle, chartType, isInitialLoading, pair, timeframe, animationOffset, newCandleAnimation])

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex justify-between items-center mb-4"
        layout
      >
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
        
        {/* Chart Type Toggle */}
        <motion.div 
          className="flex items-center space-x-2"
          layout
        >
          <span className="text-sm text-gray-300">Chart Type:</span>
          <div className="flex bg-gray-700 rounded-lg p-1">
            <motion.button
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'candlestick'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Candlesticks
            </motion.button>
            <motion.button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Line Chart
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className="relative"
        layout
      >
        <canvas
          ref={canvasRef}
          className="w-full h-96 bg-gray-900 rounded-lg"
          style={{ minHeight: '400px' }}
        />
        
        {/* Loading overlay - only show for initial load */}
        <AnimatePresence>
          {isInitialLoading && (
            <motion.div 
              className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="text-white text-lg"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Loading chart...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chart Legend */}
      <motion.div 
        className="mt-4 flex flex-wrap gap-4 text-sm text-gray-300"
        layout
      >
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Bullish (Close ≥ Open)</span>
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Bearish (Close &lt; Open)</span>
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Live (Increasing)</span>
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span>Live (Decreasing)</span>
        </motion.div>
        {chartType === 'line' && (
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Price Line</span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
} 