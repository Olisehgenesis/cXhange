import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { candlestickGenerator, DynamicCandle } from '../utils/candlestickGenerator'
import { Price } from '../types/api'

interface TradeChartProps {
  pair: string
  isLoading?: boolean
  onPriceUpdate?: (price: number, change: number) => void
  onChartReady?: () => void // new prop
}

type ChartType = 'candlestick' | 'line'

const TIMEFRAME_OPTIONS = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1d' },
];

export const TradeChart: React.FC<TradeChartProps> = ({
  pair,
  isLoading = false,
  onPriceUpdate,
  onChartReady
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [candles, setCandles] = useState<DynamicCandle[]>([])
  const [liveCandle, setLiveCandle] = useState<DynamicCandle | null>(null)
  const [chartType, setChartType] = useState<ChartType>('candlestick')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isTimeframeLoading, setIsTimeframeLoading] = useState(false)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [animationOffset, setAnimationOffset] = useState(0)
  const [newCandleAnimation, setNewCandleAnimation] = useState(false)

  // Clear previous pair data when pair or timeframe changes
  useEffect(() => {
    if (pair) {
      candlestickGenerator.clearAll()
      setCandles([])
      setLiveCandle(null)
      setAnimationOffset(0)
    }
  }, [pair, selectedTimeframe])

  // When timeframe changes, show loading overlay
  useEffect(() => {
    if (!isInitialLoading) {
      setIsTimeframeLoading(true);
    }
  }, [selectedTimeframe]);

  // Fetch price data and generate candles
  useEffect(() => {
    if (!pair) return
    const fetchPricesAndGenerateCandles = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/prices/latest?pair=${pair}&limit=1000`)
        const data = await response.json()
        if (data.prices && Array.isArray(data.prices)) {
          data.prices.forEach((price: Price) => {
            candlestickGenerator.addPrice(pair, price)
          })
          const generatedCandles = candlestickGenerator.generateCandles(pair, selectedTimeframe, 100)
          setCandles(generatedCandles)
          const live = candlestickGenerator.generateLiveCandle(pair, selectedTimeframe)
          setLiveCandle(live)
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
        setIsTimeframeLoading(false);
      }
    }
    fetchPricesAndGenerateCandles()
    const interval = setInterval(async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/prices/latest?pair=${pair}&limit=50`)
        const data = await response.json()
        if (data.prices && Array.isArray(data.prices)) {
          data.prices.forEach((price: Price) => {
            candlestickGenerator.addPrice(pair, price)
          })
          const generatedCandles = candlestickGenerator.generateCandles(pair, selectedTimeframe, 100)
          const hasNewCandle = generatedCandles.length > candles.length
          if (hasNewCandle) {
            setNewCandleAnimation(true)
            setTimeout(() => setNewCandleAnimation(false), 1000)
          }
          setCandles(generatedCandles)
          const live = candlestickGenerator.generateLiveCandle(pair, selectedTimeframe)
          setLiveCandle(live)
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
    }, 5000)
    return () => clearInterval(interval)
  }, [pair, selectedTimeframe, candles.length, previousPrice, onPriceUpdate])

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setAnimationOffset(prev => (prev + 1) % 20)
    }, 100)
    return () => clearInterval(animationInterval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    let allCandles = [...candles]
    if (liveCandle) {
      const existingIndex = allCandles.findIndex(candle => 
        new Date(candle.timestamp).getTime() === new Date(liveCandle.timestamp).getTime()
      )
      if (existingIndex >= 0) {
        allCandles[existingIndex] = liveCandle
      } else {
        allCandles.push(liveCandle)
      }
    }
    if (allCandles.length === 0) return
    allCandles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const prices = allCandles.flatMap(candle => [candle.open, candle.high, candle.low, candle.close])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    if (priceRange === 0) return
    const padding = 64
    const chartWidth = canvas.offsetWidth - 2 * padding
    const chartHeight = canvas.offsetHeight - 2 * padding
    // Show as many candles as possible (smaller boxes)
    const visibleCount = Math.min(160, allCandles.length)
    const startIdx = Math.max(0, allCandles.length - visibleCount)
    const visibleCandles = allCandles.slice(startIdx)
    // Make candles touch each other: candleWidth fills the entire spacing
    const candleSpacing = chartWidth / visibleCandles.length;
    const candleWidth = candleSpacing;
    ctx.fillStyle = '#EBE8D8'
    ctx.fillRect(padding, padding, chartWidth, chartHeight)
    ctx.strokeStyle = '#E0DCC7'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i + (animationOffset * 0.1)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, canvas.offsetHeight - padding)
      ctx.stroke()
    }
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvas.offsetWidth - padding, y)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.fillStyle = '#6B6456'
    ctx.font = '10px Inter'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i
      const y = padding + (chartHeight / 5) * i
      ctx.fillText(price.toFixed(6), padding - 10, y + 4)
    }
    ctx.fillStyle = '#6B6456'
    ctx.font = '10px Inter'
    ctx.textAlign = 'center'
    // Fewer time labels, but increase a bit for more candles
    const labelCount = 6
    for (let i = 0; i < visibleCandles.length; i++) {
      if (i % Math.ceil(visibleCandles.length / labelCount) === 0 || i === visibleCandles.length - 1) {
        const x = padding + i * candleSpacing + candleSpacing / 2
        const ts = new Date(visibleCandles[i].timestamp)
        let label = ''
        label = ts.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
        ctx.fillText(label, x, canvas.offsetHeight - padding + 14)
      }
    }
    if (chartType === 'candlestick') {
      visibleCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const isGreen = candle.close >= candle.open
        const isLive = candle.isLive
        const isNew = index === visibleCandles.length - 1 && newCandleAnimation
        const isIncreasing = candle.close >= candle.open
        const animationProgress = isNew ? Math.sin(Date.now() * 0.01) * 0.1 + 1 : 1
        const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight
        const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight
        const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight
        const color = isLive ? (isIncreasing ? '#2F5233' : '#8B3A3A') : (isGreen ? '#2F5233' : '#8B3A3A')
        const borderColor = isLive ? (isIncreasing ? '#1F3A22' : '#7A3333') : (isGreen ? '#1F3A22' : '#7A3333')
        if (isLive) {
          ctx.shadowColor = isIncreasing ? '#2F5233' : '#8B3A3A'
          ctx.shadowBlur = 10
        }
        ctx.strokeStyle = color
        ctx.lineWidth = isLive ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(x, highY)
        ctx.lineTo(x, lowY)
        ctx.stroke()
        const bodyHeight = Math.max(1, Math.abs(closeY - openY))
        const bodyY = Math.min(openY, closeY)
        ctx.globalAlpha = 0.8
        ctx.fillStyle = color
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
        ctx.globalAlpha = 1.0
        ctx.strokeStyle = borderColor
        ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
        if (isLive) {
          const isIncreasing = candle.close >= candle.open
          ctx.fillStyle = isIncreasing ? '#2F5233' : '#8B3A3A'
          ctx.beginPath()
          ctx.arc(x, highY - 10, 4, 0, 2 * Math.PI)
          ctx.fill()
        }
        ctx.shadowBlur = 0
      })
    } else {
      ctx.strokeStyle = '#2D2A24'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
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
      visibleCandles.forEach((candle, index) => {
        const x = padding + index * candleSpacing + candleSpacing / 2
        const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight
        const isLive = candle.isLive
        const isNew = index === visibleCandles.length - 1 && newCandleAnimation
        const isIncreasing = candle.close >= candle.open
        const pointSize = 4
        ctx.fillStyle = isLive ? (isIncreasing ? '#2F5233' : '#8B3A3A') : '#2D2A24'
        ctx.beginPath()
        ctx.arc(x, closeY, pointSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.strokeStyle = '#F5F2E8'
        ctx.lineWidth = 1
        ctx.stroke()
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
    ctx.fillStyle = '#2D2A24'
    ctx.font = '16px Outfit'
    ctx.textAlign = 'center'
    const displayPair = pair.replace('_', '/')
    ctx.fillText(`${displayPair}`, canvas.offsetWidth / 2, 20)
    if (isInitialLoading) {
      ctx.fillStyle = 'rgba(45, 42, 36, 0.7)'
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      ctx.fillStyle = '#F5F2E8'
      ctx.font = '14px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('Loading...', canvas.offsetWidth / 2, canvas.offsetHeight / 2)
    }
  }, [candles, liveCandle, chartType, isInitialLoading, pair, animationOffset, newCandleAnimation])

  // Call onChartReady when initial loading is done
  React.useEffect(() => {
    if (!isInitialLoading && onChartReady) {
      onChartReady();
    }
  }, [isInitialLoading, onChartReady]);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Chart header with pair name, chart type, and timeframe toggles */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2"
        layout
      >
        <h3 className="text-lg font-outfit font-semibold text-milo-primary">{pair.replace('_', '/')}</h3>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Chart Type Toggle */}
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
          {/* Timeframe Toggle */}
          <div className="flex bg-sand-200 rounded-milo p-1 ml-2">
            {TIMEFRAME_OPTIONS.map((tf) => (
              <motion.button
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors font-outfit ${
                  selectedTimeframe === tf.value
                    ? 'bg-forest-500 text-white shadow-milo'
                    : 'text-sand-700 hover:text-sand-800 hover:bg-sand-100'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tf.label}
              </motion.button>
            ))}
          </div>
        </div>
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
        <AnimatePresence>
          {(isInitialLoading || isTimeframeLoading) && (
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