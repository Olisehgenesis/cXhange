import React, { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts'
import { Candle } from '../types/api'

interface TradingChartProps {
  data: Candle[]
  pair: string
  timeframe: string
  isLoading?: boolean
}

export const TradingChart: React.FC<TradingChartProps> = ({ 
  data, 
  pair, 
  timeframe, 
  isLoading = false 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1e293b' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data.length) return

    // Transform data for the chart
    const chartData: CandlestickData[] = data
      .slice()
      .reverse() // Reverse to show oldest first
      .map(candle => ({
        time: new Date(candle.timestamp).getTime() / 1000,
        open: parseFloat(candle.open_price),
        high: parseFloat(candle.high_price),
        low: parseFloat(candle.low_price),
        close: parseFloat(candle.close_price),
      }))

    seriesRef.current.setData(chartData)
  }, [data])

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-dark-800 rounded-lg flex items-center justify-center">
        <div className="text-white">Loading chart...</div>
      </div>
    )
  }

  return (
    <div className="w-full bg-dark-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">
          {pair} - {timeframe}
        </h3>
        <div className="text-gray-400 text-sm">
          {data.length} candles
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-96" />
    </div>
  )
} 