'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, PriceScaleMode } from 'lightweight-charts'
import { useTheme } from "next-themes"

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface StockChartProps {
  symbol: string
  interval: string
  range: string
}

const StockChart: React.FC<StockChartProps> = ({ symbol, interval, range }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Bar"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const [data, setData] = useState<ChartData[]>([])
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    fetchData()
  }, [symbol, interval, range])

  useEffect(() => {
    if (chartContainerRef.current && data.length > 0) {
      const chartOptions = {
        layout: {
          background: { type: ColorType.Solid, color: theme === 'dark' ? '#09090b' : 'white' },
          textColor: theme === 'dark' ? '#E5E7EB' : '#09090b',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 10,
          minBarSpacing: 4,
        },
        height: 600,
      }

      if (!chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, chartOptions)
        candlestickSeriesRef.current = chartRef.current.addBarSeries({
          upColor: '#089981',
          downColor: '#f23645',
        })
      } else {
        chartRef.current.applyOptions(chartOptions)
      }

      candlestickSeriesRef.current?.setData(data)

      candlestickSeriesRef.current?.priceScale().applyOptions({
        mode: PriceScaleMode.Logarithmic,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        }
      });
      chartRef.current.timeScale().fitContent();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [data, theme])

  const fetchData = async () => {
    setError(null)
    try {
      const response = await fetch(
        `/api/stock?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load stock data. Please try again later.')
    }
  }

  return (
    <div className="w-full">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div ref={chartContainerRef} className="w-full h-[600px]" />
    </div>
  )
}

export default StockChart

