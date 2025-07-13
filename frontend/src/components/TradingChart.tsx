import React, { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts'
import { Candle, LiveCandle } from '../types/api'

// Test if the chart library is loaded
console.log('📊 Chart library loaded:', {
  createChart: typeof createChart
})

interface TradingChartProps {
  data: Candle[]
  liveCandle?: LiveCandle | null
  pair: string
  timeframe: string
  isLoading?: boolean
}

export const TradingChart: React.FC<TradingChartProps> = ({ 
  data, 
  liveCandle,
  pair, 
  timeframe, 
  isLoading = false 
}) => {
  console.log('🎯 TradingChart component rendered with props:', {
    pair,
    timeframe,
    dataLength: data.length,
    hasLiveCandle: !!liveCandle,
    isLoading
  })
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  // Debug chart container on every render
  useEffect(() => {
    console.log('🔍 Chart container check:', {
      containerExists: !!chartContainerRef.current,
      containerWidth: chartContainerRef.current?.clientWidth,
      containerHeight: chartContainerRef.current?.clientHeight,
      chartExists: !!chartRef.current,
      seriesExists: !!seriesRef.current
    })
  })
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

    useEffect(() => {
    console.log('🔄 CHART CREATION useEffect triggered')
    console.log('Chart container ref exists:', !!chartContainerRef.current)
    
    if (!chartContainerRef.current) {
      console.log('❌ No chart container ref, returning early')
      return
    }

    console.log('Chart container dimensions:', {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight
    })

    // Clean up existing chart if it exists
    if (chartRef.current) {
      console.log('🧹 Cleaning up existing chart')
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    // Small delay to ensure container is properly rendered
    const timer = setTimeout(() => {
      try {
        console.log('Chart container dimensions:', {
          width: chartContainerRef.current?.clientWidth,
          height: chartContainerRef.current?.clientHeight
        })

        if (!chartContainerRef.current) {
          console.log('❌ Chart container not available after delay')
          return
        }

        console.log('🎨 Creating chart...')
        // Create chart
        const chart = createChart(chartContainerRef.current, {
          width: Math.max(chartContainerRef.current.clientWidth, 600),
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
            secondsVisible: true, // Show seconds for short timeframes
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

        console.log('✅ Chart created successfully')
        console.log('✅ Candlestick series created:', !!candlestickSeries)
        console.log('Chart container dimensions after creation:', {
          width: chartContainerRef.current?.clientWidth,
          height: chartContainerRef.current?.clientHeight
        })

        chartRef.current = chart
        seriesRef.current = candlestickSeries
        
        console.log('✅ Chart and series refs set successfully')

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            })
          }
        }

        window.addEventListener('resize', handleResize)

        // Cleanup function for this setTimeout
        return () => {
          window.removeEventListener('resize', handleResize)
          if (chartRef.current) {
            chartRef.current.remove()
          }
        }
      } catch (error) {
        console.error('❌ Error creating chart:', error)
      }
    }, 100) // 100ms delay

    // Cleanup function for the useEffect
    return () => {
      console.log('🧹 Chart creation useEffect cleanup')
      clearTimeout(timer)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // Recreate chart when pair or timeframe changes
  useEffect(() => {
    console.log('🔄 PAIR/TIMEFRAME CHANGE - Recreating chart for:', pair, timeframe)
    
    if (chartRef.current) {
      console.log('🧹 Cleaning up existing chart due to pair/timeframe change')
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    // Small delay to ensure cleanup is complete
    const timer = setTimeout(() => {
      if (chartContainerRef.current && !chartRef.current) {
        console.log('🎨 Recreating chart after pair/timeframe change...')
        
        try {
          const chart = createChart(chartContainerRef.current, {
            width: Math.max(chartContainerRef.current.clientWidth, 600),
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
              secondsVisible: true,
            },
          })

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
          
          console.log('✅ Chart recreated successfully after pair/timeframe change')
        } catch (error) {
          console.error('❌ Error recreating chart:', error)
        }
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [pair, timeframe])

  useEffect(() => {
    console.log('=== TRADING CHART DEBUG ===')
    console.log('TradingChart received data:', data)
    console.log('Live candle:', liveCandle)
    console.log('Data length:', data.length)
    console.log('Series ref exists:', !!seriesRef.current)
    console.log('Chart ref exists:', !!chartRef.current)
    
    if (!seriesRef.current) {
      console.log('❌ No series ref, returning early')
      return
    }

    if (!data.length && !liveCandle) {
      console.log('❌ No data and no live candle, returning early')
      return
    }

    // Transform historical data for the chart
    const historicalData: CandlestickData[] = data
      .slice()
      .map(candle => {
        const timestamp = new Date(candle.timestamp)
        const timeInSeconds = Math.floor(timestamp.getTime() / 1000)
        
        const transformed = {
          time: timeInSeconds as any,
          open: parseFloat(candle.open_price),
          high: parseFloat(candle.high_price),
          low: parseFloat(candle.low_price),
          close: parseFloat(candle.close_price),
        }
        
        // Validate the data
        if (isNaN(transformed.open) || isNaN(transformed.high) || isNaN(transformed.low) || isNaN(transformed.close)) {
          console.error('❌ Invalid candle data:', candle)
          return null
        }
        
        return transformed
      })
      .filter((item): item is CandlestickData => item !== null)
      .sort((a, b) => (a.time as number) - (b.time as number)) // Sort by time ascending

    // Add live candle if available
    let finalChartData = [...historicalData]
    
    if (liveCandle) {
      const liveTimestamp = new Date(liveCandle.timestamp)
      const liveTimeInSeconds = Math.floor(liveTimestamp.getTime() / 1000)
      
      const liveCandleData: CandlestickData = {
        time: liveTimeInSeconds as any,
        open: parseFloat(liveCandle.open_price),
        high: parseFloat(liveCandle.high_price),
        low: parseFloat(liveCandle.low_price),
        close: parseFloat(liveCandle.close_price),
      }
      
      // Validate live candle data
      if (isNaN(liveCandleData.open) || isNaN(liveCandleData.high) || isNaN(liveCandleData.low) || isNaN(liveCandleData.close)) {
        console.error('❌ Invalid live candle data:', liveCandle)
      } else {
        // Check if we already have a candle for this time period
        const existingIndex = finalChartData.findIndex(candle => candle.time === liveTimeInSeconds)
        
        if (existingIndex >= 0) {
          // Update existing candle with live data
          finalChartData[existingIndex] = liveCandleData
        } else {
          // Add new live candle
          finalChartData.push(liveCandleData)
        }
        
        console.log('✅ Live candle data:', liveCandleData)
      }
    }

    // Final sort to ensure proper time order
    finalChartData.sort((a, b) => (a.time as number) - (b.time as number))

    console.log('Final chart data length:', finalChartData.length)
    console.log('First few chart data points:', finalChartData.slice(0, 3))
    console.log('Last few chart data points:', finalChartData.slice(-3))
    
    // Debug time order
    if (finalChartData.length > 1) {
      const firstTime = finalChartData[0].time as number
      const lastTime = finalChartData[finalChartData.length - 1].time as number
      console.log('Time order check - First:', new Date(firstTime * 1000).toISOString(), 'Last:', new Date(lastTime * 1000).toISOString())
      console.log('Time order check - First timestamp:', firstTime, 'Last timestamp:', lastTime)
    }
    
    console.log('Setting data on series...')
    
    try {
      if (finalChartData.length > 0) {
        seriesRef.current.setData(finalChartData)
        console.log('✅ Data set successfully on chart series')
        
        // Force chart to fit content
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
          console.log('✅ Chart fit content called')
        }
      } else {
        console.log('⚠️  No chart data to set, creating test candle')
        
        // Create a test candle to see if the chart works at all
        const now = Math.floor(Date.now() / 1000)
        const testCandle: CandlestickData = {
          time: now as any,
          open: 100,
          high: 110,
          low: 90,
          close: 105,
        }
        
        seriesRef.current.setData([testCandle])
        console.log('✅ Test candle set:', testCandle)
        
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
        }
      }
    } catch (error) {
      console.error('❌ Error setting data on chart:', error)
    }
  }, [data, liveCandle])

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
      <div 
        ref={chartContainerRef} 
        className="w-full h-96 border border-red-500 bg-gray-800" 
        style={{ minHeight: '400px' }}
      />
    </div>
  )
} 