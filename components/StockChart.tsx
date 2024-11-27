'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { useTheme } from "next-themes"
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

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
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [todayPrice, setTodayPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
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
          vertLines: { visible:false },
          horzLines: { visible:false },
        },
        timeScale: {
          timeVisible: false,
          rightOffset: 10,
          minBarSpacing: 2,
        },
        height: 600,
      }

      if (!chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, chartOptions)
        candlestickSeriesRef.current = chartRef.current.addBarSeries({
          upColor: '#00ff55',
          downColor: '#ed4807',
        })
        volumeSeriesRef.current = chartRef.current.addHistogramSeries({
          color: '#00ff55',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        })
      } else {
        chartRef.current.applyOptions(chartOptions)
      }

      candlestickSeriesRef.current?.setData(data)
      volumeSeriesRef.current?.setData(data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close > d.open ? '#00ff55' : '#ed4807'
      })))

      candlestickSeriesRef.current?.priceScale().applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        }
      });
      volumeSeriesRef.current?.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
      chartRef.current.timeScale().fitContent();

      // Set today's price and price change
      if (data.length > 0) {
        const latestData = data[data.length - 1]
        setTodayPrice(latestData.close)
        const yesterdayClose = data[data.length - 2]?.close
        if (yesterdayClose) {
          const change = ((latestData.close - yesterdayClose) / yesterdayClose) * 100
          setPriceChange(change)
        }
      }
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [data, theme])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/stock?symbol=${symbol}&interval=${interval}&range=${range}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load stock data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="flex justify-center items-center h-[600px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="mt-4 ">
            <h3 className="text-lg font-semibold">{symbol}</h3>
            {todayPrice !== null && priceChange !== null && (
              <div className="flex items-center text-sm mt-1">
                <span className="font-medium mr-2">{todayPrice.toFixed(2)}</span>
                <span className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div ref={chartContainerRef} className="w-full h-[600px]" />
        </>
      )}
      
    </div>
  )
}

export default StockChart
