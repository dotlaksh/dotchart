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
  { label: '3M', value: '1d', range: '3mo' },
  { label: '6M', value: '1d', range: '6mo' },
  { label: '1Y', value: '1d', range: '1y' },
  { label: '2Y', value: '1wk', range: '2y' },
  { label: '5Y', value: '1wk', range: '5y' },
  { label: '10Y', value: '1mo', range: '10y' },
  { label: 'All', value: '1mo', range: 'max' }

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
          <div className="absolute top-0 left-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg m-2">
            <h3 className="text-sm font-medium,">{symbol}</h3>
            {todayPrice !== null && priceChange !== null && (
              <div className="flex items-center text-sm">
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  // Touch gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStockIndex < totalStocks - 1) {
      handleNext();
    }
    if (isRightSwipe && currentStockIndex > 0) {
      handlePrevious();
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]">

        {/* Main Card */}
        <Card className="border-2 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/50 h-full">
          <CardContent className="p-0 h-full">
            <div className="flex flex-col h-full">
              {/* Chart Area */}
              <div 
                className="flex-1 min-h-[100px] sm:min-h-[250px] md:min-h-[300px]"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <StockChart symbol={currentStock.Symbol} interval={stockInterval} range={stockRange} />
              </div>
              
              {/* Controls Area */}
              <div className="bg-muted/30 border-t-2 border-border p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5 flex-shrink-0">
                {/* First row - Timeframe and Category selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  {/* Interval buttons - top row on mobile, left on desktop */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Timeframe:</span>
                    <div className="flex gap-1 bg-background rounded-lg p-1 border-2 border-border shadow-sm">
                      {intervals.map((item) => (
                        <button
                          key={item.label}
                          className={clsx(
                            "px-2 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 min-w-[30px]",
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

                  {/* Category selector - next row on mobile, right on desktop */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Category:</span>
                    <select
                      className="border-2 border-border rounded-lg px-2 py-1.5 text-xs sm:text-sm bg-background hover:border-primary transition-colors cursor-pointer font-medium shadow-sm flex-1 sm:flex-none min-w-[120px] max-w-[200px]"
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
                </div>

                {/* Second row - Navigation buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStockIndex === 0}
                    aria-label="Previous stock"
                    className="border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200 px-4 sm:px-6 font-semibold shadow-sm disabled:opacity-40 text-sm sm:text-base h-10 sm:h-11 flex-1 sm:flex-none min-w-[100px]"
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  
                  <div className="text-center px-3 sm:px-4">
                    <div className="text-sm sm:text-base text-muted-foreground mb-1">Stock</div>
                    <div className="text-base sm:text-lg font-bold">
                      {currentStockIndex + 1} / {totalStocks}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStockIndex === totalStocks - 1}
                    aria-label="Next stock"
                    className="border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200 px-4 sm:px-6 font-semibold shadow-sm disabled:opacity-40 text-sm sm:text-base h-10 sm:h-11 flex-1 sm:flex-none min-w-[100px]"
                  >
                    <span className="sm:hidden">Next</span>
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>      
      </div>
    </div>
  );
};

export { StockChart, StockCarousel }
