import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Candle, LiveCandle } from '../types/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
)

interface ChartJSCandlestickChartProps {
  data: Candle[]
  liveCandle?: LiveCandle | null
  pair: string
  timeframe: string
  isLoading?: boolean
}

export const ChartJSCandlestickChart: React.FC<ChartJSCandlestickChartProps> = ({
  data,
  liveCandle,
  pair,
  timeframe,
  isLoading = false
}) => {
  const chartRef = useRef<ChartJS>(null)

  console.log('🎯 ChartJS Candlestick Chart rendered:', {
    pair,
    timeframe,
    dataLength: data.length,
    hasLiveCandle: !!liveCandle
  })

  // Process data for Chart.js
  const processChartData = () => {
    if (!data.length && !liveCandle) {
      return { labels: [], datasets: [] }
    }

    // Combine historical data with live candle
    let allData = [...data]
    if (liveCandle) {
      // Check if we already have a candle for this time period
      const existingIndex = allData.findIndex(candle => 
        new Date(candle.timestamp).getTime() === new Date(liveCandle.timestamp).getTime()
      )
      
      if (existingIndex >= 0) {
        // Update existing candle with live data
        allData[existingIndex] = {
          ...allData[existingIndex],
          open_price: liveCandle.open_price,
          high_price: liveCandle.high_price,
          low_price: liveCandle.low_price,
          close_price: liveCandle.close_price,
        }
      } else {
        // Add live candle as a new data point
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

    // Sort by timestamp (oldest first)
    allData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Create labels (timestamps)
    const labels = allData.map(candle => {
      const date = new Date(candle.timestamp)
      return date.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    })

    // Create OHLC data
    const ohlcData = allData.map(candle => ({
      o: parseFloat(candle.open_price),
      h: parseFloat(candle.high_price),
      l: parseFloat(candle.low_price),
      c: parseFloat(candle.close_price),
    }))

    console.log('📊 Processed chart data:', {
      labelsCount: labels.length,
      ohlcDataCount: ohlcData.length,
      firstLabel: labels[0],
      lastLabel: labels[labels.length - 1]
    })

    return {
      labels,
      datasets: [
        {
          label: 'OHLC',
          data: ohlcData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        }
      ]
    }
  }

  const chartData = processChartData()

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `${pair} - ${timeframe}`,
        color: '#d1d5db',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        callbacks: {
          label: function(context: any) {
            const dataPoint = context.parsed
            if (dataPoint && dataPoint.o !== undefined) {
              return [
                `Open: $${dataPoint.o.toFixed(6)}`,
                `High: $${dataPoint.h.toFixed(6)}`,
                `Low: $${dataPoint.l.toFixed(6)}`,
                `Close: $${dataPoint.c.toFixed(6)}`
              ]
            }
            return ''
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: '#d1d5db'
        },
        ticks: {
          color: '#d1d5db',
          maxTicksLimit: 10
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Price',
          color: '#d1d5db'
        },
        ticks: {
          color: '#d1d5db'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }

  // Custom candlestick rendering
  const customCandlestickData = {
    ...chartData,
    datasets: chartData.datasets.map(dataset => ({
      ...dataset,
      type: 'line' as const,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      pointBackgroundColor: (context: any) => {
        const dataPoint = context.parsed
        if (dataPoint && dataPoint.c !== undefined && dataPoint.o !== undefined) {
          return dataPoint.c >= dataPoint.o ? '#10b981' : '#ef4444'
        }
        return '#6b7280'
      },
      pointBorderColor: (context: any) => {
        const dataPoint = context.parsed
        if (dataPoint && dataPoint.c !== undefined && dataPoint.o !== undefined) {
          return dataPoint.c >= dataPoint.o ? '#10b981' : '#ef4444'
        }
        return '#6b7280'
      }
    }))
  }

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
        {chartData.labels.length > 0 ? (
          <Chart
            ref={chartRef}
            type="line"
            data={customCandlestickData}
            options={options}
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