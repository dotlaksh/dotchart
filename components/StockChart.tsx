'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Maximize2, Minimize2, Moon, Sun } from 'lucide-react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { useTheme } from "next-themes"
import { stockCategories } from '@/lib/stockList'
import clsx from "clsx"

// INTERVAL BUTTONS
const intervals: { label: string; value: string; range: string }[] = [
  { label: '6M', value: '1d', range: '6mo' },
  { label: '1Y', value: '1d', range: '1y' },
  { label: '2Y', value: '1wk', range: '2y' },
  { label: 'XY', value: '1mo', range: '10y' }
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

// Theme toggle
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
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
            background: { type: ColorType.Solid, color: '#09090b' },
            textColor: '#E5E7EB',
          },
          grid: {
            vertLines: { visible: false },
            horzLines: { visible: false },
          },
          timeScale: {
            timeVisible: true,
            rightOffset: 5,
            minBarSpacing: 2,
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
            top: 0.2,
            bottom: 0.2,
          },
        })
        // Volume series on separate pane at bottom
        volumeSeriesRef.current = chartRef.current.addHistogramSeries({
          color: '#4B5563',
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
    <div className="w-full h-full relative">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="absolute top-0 right-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg m-2 p-2">
            <h3 className="text-sm font-medium text-right">{symbol}</h3>
            {todayPrice !== null && priceChange !== null && (
              <div className="flex items-center justify-end text-sm">
                <span className="font-normal mr-2">{todayPrice.toFixed(2)}</span>
                <span className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {Math.abs(priceChange).toFixed(2)}%
                </span>
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
  PercentChange?: number; // Make this optional
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentCategory = stockCategories[currentCategoryIndex];
  const currentStock = {
    ...currentCategory.data[currentStockIndex],
    percentChange: (currentCategory.data[currentStockIndex] as StockData).PercentChange ?? (Math.random() * 10 - 5),
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!!document.fullscreenElement);
  };

  // Handle interval/range switching using buttons
  const handleIntervalClick = (selected: typeof intervals[number]) => {
    setStockRange(selected.range);
    setStockInterval(selected.value);
  };

 return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-1 md:py-1">
      <div className="max-w-7xl mx-auto">

        {/* Main Card */}
        <Card className="border-2 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/50">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Controls Area - Left Side */}
              <div className="bg-muted/30 border-b-2 md:border-b-0 md:border-r-2 border-border p-3 sm:p-4 md:p-6 space-y-3 md:space-y-5 md:w-80 lg:w-96">
                {/* Category selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <select
                    className="w-full border-2 border-border rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm bg-background hover:border-primary transition-colors cursor-pointer font-medium shadow-sm"
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Timeframe</label>
                  <div className="grid grid-cols-2 gap-2">
                    {intervals.map((item) => (
                      <button
                        key={item.label}
                        className={clsx(
                          "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border-2",
                          stockRange === item.range && stockInterval === item.value
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-background text-foreground border-border hover:bg-muted hover:border-primary"
                        )}
                        onClick={() => handleIntervalClick(item)}
                        aria-current={stockRange === item.range && stockInterval === item.value ? "page" : undefined}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-3 pt-4 border-t-2 border-border">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Stock</div>
                    <div className="text-lg font-bold">
                      {currentStockIndex + 1} / {totalStocks}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentStockIndex === 0}
                      aria-label="Previous stock"
                      className="flex-1 border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200 font-semibold shadow-sm disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentStockIndex === totalStocks - 1}
                      aria-label="Next stock"
                      className="flex-1 border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200 font-semibold shadow-sm disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chart Area - Right Side */}
              <div className="flex-1 h-[500px] sm:h-[600px] md:h-[800px]">
                <StockChart symbol={currentStock.Symbol} interval={stockInterval} range={stockRange} />
              </div>
            </div>
          </CardContent>
        </Card>      
      </div>
    </div>
  );
};

export { StockChart, StockCarousel }
