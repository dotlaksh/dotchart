'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3 } from 'lucide-react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { useTheme } from "next-themes"
import { stockCategories } from '@/lib/stockList'
import clsx from "clsx"

// INTERVAL BUTTONS
const intervals: { label: string; value: string; range: string }[] = [
  { label: 'D', value: '1d', range: '3mo' },
  { label: 'W', value: '1wk', range: '2y' },
  { label: 'M', value: '1mo', range: '10y' }
];

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
  const barSeriesRef = useRef<ISeriesApi<"Bar"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [todayPrice, setTodayPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, range])

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        })
      }
    }

    const initChart = () => {
      if (chartContainerRef.current && data.length > 0) {
        const chartOptions = {
          layout: {
            background: { type: ColorType.Solid, color: theme === 'dark' ? '#09090b' : '#ffffff' },
            textColor: theme === 'dark' ? '#E5E7EB' : '#1f2937',
          },
          grid: {
            vertLines: { color: theme === 'dark' ? '#1f2937' : '#f3f4f6' },
            horzLines: { color: theme === 'dark' ? '#1f2937' : '#f3f4f6' },
          },
          timeScale: {
            timeVisible: true,
            rightOffset: 5,
            minBarSpacing: 2,
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
          rightPriceScale: {
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        }

        // Remove any existing chart instance before creating a new one
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }

        chartRef.current = createChart(chartContainerRef.current, chartOptions)

        // Bar series on main pane (without open price)
        barSeriesRef.current = chartRef.current.addBarSeries({
          upColor: '#24f709',
          downColor: '#fb0707',
          thinBars: true,
          openVisible: false,
        })
        barSeriesRef.current.setData(data)

         // Configure the price scale for the main series
        chartRef.current.priceScale('right').applyOptions({
          scaleMargins: {
            top: 0.3,
            bottom: 0.3,
          },
        })
        // Volume series on separate pane at bottom
        volumeSeriesRef.current = chartRef.current.addHistogramSeries({
          color: '#6b7280',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
        })
        
        // Configure the volume price scale
        chartRef.current.priceScale('volume').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        })
        
        // Prepare volume data with color based on price movement
        const volumeData = data.map((item, index) => {
          const isUp = index > 0 ? item.close >= data[index - 1].close : true
          return {
            time: item.time,
            value: item.volume,
            color: isUp ? '#24f709' : '#fb0707'
          }
        })
        volumeSeriesRef.current.setData(volumeData)

        chartRef.current.timeScale().fitContent()

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
    }

    initChart()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/30">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary"></div>
            <BarChart3 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
        </div>
      ) : (
        <>
          <div className="absolute top-4 left-4 z-10 bg-card/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold tracking-tight">{symbol}</h3>
            </div>
            {todayPrice !== null && priceChange !== null && (
              <div className="space-y-1">
                <div className="text-2xl font-bold">${todayPrice.toFixed(2)}</div>
                <div className={`flex items-center text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                  {Math.abs(priceChange).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
          <div ref={chartContainerRef} className="w-full h-full" />
        </>
      )}
    </div>
  )
}

interface StockData {
  "Company Name": string;
  Symbol: string;
  PercentChange?: number;
}

interface StockCarouselProps {
  onCategoryChange: (index: number) => void;
  currentCategoryIndex: number;
  stockRange: string;
  stockInterval: string;
  setStockRange: (range: string) => void;
  setStockInterval: (interval: string) => void;
}

const StockCarousel: React.FC<StockCarouselProps> = ({
  onCategoryChange,
  currentCategoryIndex,
  stockRange,
  stockInterval,
  setStockRange,
  setStockInterval,
}) => {
  const [currentStockIndex, setCurrentStockIndex] = useState(0);

  const currentCategory = stockCategories[currentCategoryIndex];
  const stockData = currentCategory.data[currentStockIndex] as StockData;
  const currentStock: StockData & { percentChange: number } = {
    ...stockData,
    percentChange: stockData.PercentChange ?? (Math.random() * 10 - 5),
  };
  const totalStocks = currentCategory.data.length;

  const handleCategoryChange = (index: number) => {
    onCategoryChange(index);
    setCurrentStockIndex(0);
  };

  const handlePrevious = () => {
    setCurrentStockIndex((prev) => (prev - 1 + totalStocks) % totalStocks);
  };

  const handleNext = () => {
    setCurrentStockIndex((prev) => (prev + 1) % totalStocks);
  };

  const handleIntervalClick = (selected: typeof intervals[number]) => {
    setStockRange(selected.range);
    setStockInterval(selected.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-4 md:py-12 px-2 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2 md:mb-3">
            Stock Market Dashboard
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg">Real-time market data and analytics</p>
        </div>

        {/* Main Card */}
        <Card className="border-2 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/50">
          <CardContent className="p-0">
            <div className="flex flex-col">
              {/* Chart Area */}
              <div className="h-[400px] sm:h-[500px] md:h-[550px] p-3 sm:p-4 md:p-6">
                <StockChart symbol={currentStock.Symbol} interval={stockInterval} range={stockRange} />
              </div>
              
              {/* Controls Area */}
              <div className="bg-muted/30 border-t-2 border-border p-3 sm:p-4 md:p-6 space-y-3 md:space-y-5">
                {/* First row - Category selector and interval buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                    <span className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">Category:</span>
                    <select
                      className="border-2 border-border rounded-lg px-2 sm:px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-background hover:border-primary transition-colors cursor-pointer font-medium shadow-sm flex-1 sm:flex-none"
                      value={currentCategoryIndex}
                      onChange={(e) => handleCategoryChange(Number(e.target.value))}
                    >
                      {stockCategories.map((category, index) => (
                        <option key={index} value={index}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Interval buttons */}
                  <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                    <span className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">Timeframe:</span>
                    <div className="flex gap-1 md:gap-2 bg-background rounded-lg p-0.5 md:p-1 border-2 border-border shadow-sm flex-1 sm:flex-none">
                      {intervals.map((item) => (
                        <button
                          key={item.label}
                          className={clsx(
                            "px-3 sm:px-4 md:px-5 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-semibold transition-all duration-200 flex-1 sm:flex-none",
                            stockRange === item.range && stockInterval === item.value
                              ? "bg-primary text-primary-foreground shadow-md scale-105"
                              : "bg-transparent text-foreground hover:bg-muted"
                          )}
                          onClick={() => handleIntervalClick(item)}
                          aria-current={stockRange === item.range && stockInterval === item.value ? "page" : undefined}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Second row - Prev button on left, Next button on right */}
                <div className="flex items-center justify-between pt-1 md:pt-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStockIndex === 0}
                    aria-label="Previous stock"
                    className="border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200 px-3 sm:px-4 md:px-6 font-semibold shadow-sm disabled:opacity-40 text-xs sm:text-sm h-8 md:h-10"
                  >
                    <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden xs:inline">Previous</span>
                    <span className="xs:hidden">Prev</span>
                  </Button>
                  
                  <div className="text-center">
                    <div className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">Stock</div>
                    <div className="text-sm md:text-lg font-bold">
                      {currentStockIndex + 1} / {totalStocks}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStockIndex === totalStocks - 1}
                    aria-label="Next stock"
                    className="border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200 px-3 sm:px-4 md:px-6 font-semibold shadow-sm disabled:opacity-40 text-xs sm:text-sm h-8 md:h-10"
                  >
                    <span className="xs:hidden">Next</span>
                    <span className="hidden xs:inline">Next</span>
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-4 md:mt-8 text-center px-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Viewing: <span className="font-semibold text-foreground">{currentStock["Company Name"]}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export { StockChart, StockCarousel }
