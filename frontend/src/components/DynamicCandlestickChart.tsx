import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { candlestickGenerator, DynamicCandle } from '../utils/candlestickGenerator'
import { Price } from '../types/api'
import { ZoomIn, ZoomOut } from 'lucide-react'

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
  const [zoom, setZoom] = useState(1)

  

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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        // Fetch latest prices from API
        const response = await fetch(`${apiUrl}/api/prices/latest?pair=${pair}&limit=1000`)
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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/prices/latest?pair=${pair}&limit=50`)
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

  // Handle zoom with mouse wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return // let browser zoom
      e.preventDefault()
      setZoom(z => Math.max(0.5, Math.min(3, z + (e.deltaY < 0 ? 0.1 : -0.1))))
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // HiDPI support
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

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
    const padding = 64
    const chartWidth = canvas.offsetWidth - 2 * padding
    const chartHeight = canvas.offsetHeight - 2 * padding
    // Zoom logic: show fewer candles when zoomed in
    const visibleCount = Math.max(10, Math.floor(allCandles.length / zoom))
    const startIdx = Math.max(0, allCandles.length - visibleCount)
    const visibleCandles = allCandles.slice(startIdx)
    const candleWidth = Math.max(2, chartWidth / visibleCandles.length - 2)
    const candleSpacing = chartWidth / visibleCandles.length

    // Fill chart background
    ctx.fillStyle = '#EBE8D8' // Slightly lighter sand for depth
    ctx.fillRect(padding, padding, chartWidth, chartHeight)

    // Draw grid with subtle animation
    ctx.strokeStyle = '#E0DCC7' // Light Taupe
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    // Vertical grid lines with slight movement
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i + (animationOffset * 0.1)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, canvas.offsetHeight - padding)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvas.offsetWidth - padding, y)
      ctx.stroke()
    }

    ctx.setLineDash([])

    // Draw price labels
    ctx.fillStyle = '#6B6456' // Warm Slate
    ctx.font = '12px Inter'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i
      const y = padding + (chartHeight / 5) * i
      ctx.fillText(price.toFixed(6), padding - 10, y + 4)
    }

    // Draw time labels (X-axis)
    ctx.fillStyle = '#6B6456' // Warm Slate
    ctx.font = '12px Inter'
    ctx.textAlign = 'center'
    const labelCount = Math.max(4, Math.min(8, Math.floor(allCandles.length / 6)))
    for (let i = 0; i < allCandles.length; i++) {
      if (i % Math.ceil(allCandles.length / labelCount) === 0 || i === allCandles.length - 1) {
        const x = padding + i * candleSpacing + candleSpacing / 2
        const ts = new Date(allCandles[i].timestamp)
        let label = ''
        if (timeframe.endsWith('m') || timeframe === '1h') {
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
        ctx.fillText(label, x, canvas.offsetHeight - padding + 18)
      }
    }

    if (chartType === 'candlestick') {
      // Draw candlesticks with animation
      visibleCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const isGreen = candle.close >= candle.open
        const isLive = candle.isLive
        const isNew = index === visibleCandles.length - 1 && newCandleAnimation
        const isIncreasing = candle.close >= candle.open

        // Calculate Y positions with animation for new candles
        const animationProgress = isNew ? Math.sin(Date.now() * 0.01) * 0.1 + 1 : 1
        const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight
        const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight
        const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight

        // Choose colors based on live status and animation
        const color = isLive ? (isIncreasing ? '#2F5233' : '#8B3A3A') : (isGreen ? '#2F5233' : '#8B3A3A')
        const borderColor = isLive ? (isIncreasing ? '#1F3A22' : '#7A3333') : (isGreen ? '#1F3A22' : '#7A3333')

        // Add glow effect for live candles
        if (isLive) {
          ctx.shadowColor = isIncreasing ? '#2F5233' : '#8B3A3A'
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
        
        // Set fill with 80% opacity as specified
        ctx.globalAlpha = 0.8
        ctx.fillStyle = color
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
        ctx.globalAlpha = 1.0

        // Draw border
        ctx.strokeStyle = borderColor
        ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)

        // Add live indicator - green for increasing, red for decreasing
        if (isLive) {
          const isIncreasing = candle.close >= candle.open
          ctx.fillStyle = isIncreasing ? '#2F5233' : '#8B3A3A'
          ctx.beginPath()
          ctx.arc(x, highY - 10, 4, 0, 2 * Math.PI)
          ctx.fill()
        }

        // Reset shadow
        ctx.shadowBlur = 0
      })
    } else {
      // Draw line chart - ensure it's a joined curve with animation
      ctx.strokeStyle = '#2D2A24' // Charcoal
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()

      // Draw the main line connecting all points with smooth animation
      visibleCandles.forEach((candle, index) => {
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
      visibleCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight
        const isLive = candle.isLive
        const isNew = index === visibleCandles.length - 1 && newCandleAnimation
        const isIncreasing = candle.close >= candle.open

        // Fixed point size
        const pointSize = 4

        // Draw point with different colors for live vs historical
        ctx.fillStyle = isLive ? (isIncreasing ? '#2F5233' : '#8B3A3A') : '#2D2A24'
        ctx.beginPath()
        ctx.arc(x, closeY, pointSize, 0, 2 * Math.PI)
        ctx.fill()

        // Add border to points
        ctx.strokeStyle = '#F5F2E8' // Cream
        ctx.lineWidth = 1
        ctx.stroke()

        // Add glow for live points
        if (isLive) {
          ctx.shadowColor = isIncreasing ? '#2F5233' : '#8B3A3A'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(x, closeY, pointSize + 2, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      })
    }

    // Draw title with subtle animation
    ctx.fillStyle = '#2D2A24' // Charcoal
    ctx.font = '16px Outfit'
    ctx.textAlign = 'center'
    const displayPair = pair.replace('_', '/')
    ctx.fillText(`${displayPair} - ${timeframe}`, canvas.offsetWidth / 2, 20)

    // Draw loading indicator only for initial load
    if (isInitialLoading) {
      ctx.fillStyle = 'rgba(45, 42, 36, 0.7)' // Charcoal with opacity
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      
      ctx.fillStyle = '#F5F2E8' // Cream
      ctx.font = '14px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('Loading...', canvas.offsetWidth / 2, canvas.offsetHeight / 2)
    }

  }, [candles, liveCandle, chartType, isInitialLoading, pair, timeframe, animationOffset, newCandleAnimation, zoom])

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-end mb-2 gap-2">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 rounded hover:bg-sand-200 transition-colors" title="Zoom Out">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 rounded hover:bg-sand-200 transition-colors" title="Zoom In">
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
      <motion.div 
        className="flex justify-between items-center mb-4"
        layout
      >
        <h3 className="text-lg font-outfit font-semibold text-milo-primary">Price Chart</h3>
        
        {/* Chart Type Toggle */}
        <motion.div 
          className="flex items-center space-x-2"
          layout
        >
          <span className="text-sm text-milo-secondary">Chart Type:</span>
          <div className="flex bg-sand-200 rounded-milo p-1">
            <motion.button
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1 text-sm rounded-md transition-colors font-outfit ${
                chartType === 'candlestick'
                  ? 'bg-forest-500 text-white shadow-milo'
                  : 'text-sand-700 hover:text-sand-800 hover:bg-sand-100'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Candlesticks
            </motion.button>
            <motion.button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded-md transition-colors font-outfit ${
                chartType === 'line'
                  ? 'bg-forest-500 text-white shadow-milo'
                  : 'text-sand-700 hover:text-sand-800 hover:bg-sand-100'
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
          className="w-full h-96 bg-sand-200 rounded-milo"
          style={{ minHeight: '400px' }}
        />
        
        {/* Loading overlay - only show for initial load */}
        <AnimatePresence>
          {isInitialLoading && (
            <motion.div 
              className="absolute inset-0 bg-sand-800 bg-opacity-50 flex items-center justify-center rounded-milo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="text-sand-100 text-lg font-outfit"
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
        className="mt-4 flex flex-wrap gap-4 text-sm text-milo-secondary"
        layout
      >
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-forest-500 rounded"></div>
          <span className="font-inter">Bullish (Close ≥ Open)</span>
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-burgundy-500 rounded"></div>
          <span className="font-inter">Bearish (Close &lt; Open)</span>
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-forest-500 rounded-full"></div>
          <span className="font-inter">Live (Increasing)</span>
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-4 h-4 bg-burgundy-500 rounded-full"></div>
          <span className="font-inter">Live (Decreasing)</span>
        </motion.div>
        {chartType === 'line' && (
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-sand-800 rounded-full"></div>
            <span className="font-inter">Price Line</span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
} 