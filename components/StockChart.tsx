'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Maximize2, Minimize2, Moon, Sun } from 'lucide-react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { useTheme } from "next-themes"
import { stockCategories } from '@/lib/stockList'
import clsx from "clsx"

// INTERVAL BUTTONS
const intervals: { label: string; value: string; range: string }[] = [
  { label: 'D', value: '1d', range: '3mo' },
  { label: 'W', value: '1wk', range: '3y' },
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
  const candlestickSeriesRef = useRef<ISeriesApi<"Bar"> | null>(null)
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

    // 10-period (interval-based) Moving Average
    const calculateMovingAverage = (data: ChartData[], length: number) => {
      const result: { time: string, value: number }[] = []
      let sum = 0
      for (let i = 0; i < data.length; ++i) {
        sum += data[i].close
        if (i >= length) {
          sum -= data[i - length].close
        }
        if (i >= length - 1) {
          result.push({
            time: data[i].time,
            value: +(sum / length).toFixed(2),
          })
        }
      }
      return result
    }

    const maLength = 10 // Always 10 periods, adjusts by interval

    const initChart = () => {
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

        // Candlestick
        candlestickSeriesRef.current = chartRef.current.addBarSeries({
          upColor: '#089981',
          downColor: '#f23645',
        })
        candlestickSeriesRef.current.setData(data)
        // 10-period Moving Average
        const maData = calculateMovingAverage(data, maLength)
        maSeriesRef.current = chartRef.current.addLineSeries({
          color: '#eab308', // yellow
          lineWidth: 1,
          priceLineVisible: false
        })
        maSeriesRef.current.setData(maData)

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
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10 bg-background/90 backdrop-blur-sm rounded-md p-1 sm:p-2 text-xs sm:text-sm">
            <h3 className="font-semibold leading-tight">{symbol}</h3>
            {todayPrice !== null && priceChange !== null && (
              <div className="flex items-center mt-0.5 sm:mt-1 text-xs sm:text-sm">
                <span className="font-medium mr-1 sm:mr-2">{todayPrice.toFixed(2)}</span>
                <span className={`flex items-center ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
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
    <div className="flex flex-col h-full w-full max-w-full sm:max-w-2xl mx-auto mt-2 sm:mt-4 md:mt-6 px-2 sm:px-4">
      {/* Updated chart container with responsive height for mobile portrait */}
      <div className="h-[60vh] xs:h-[65vh] sm:h-[70vh] md:h-[75vh] lg:h-[80vh] xl:flex-grow overflow-hidden rounded-lg border border-muted-foreground/10">
        <StockChart symbol={currentStock.Symbol} interval={stockInterval} range={stockRange} />
      </div>
      
      {/* Single row layout for all controls */}
      <div className="bg-background border-t border-muted-foreground/20 p-1.5 sm:p-2 md:p-3 mt-1">
        <div className="flex items-center justify-between gap-1 sm:gap-2 md:gap-4">
          {/* Left side - Theme toggle and fullscreen */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleFullscreen} 
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10"
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
          </div>

          {/* Center - Category selector and interval buttons */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-1 justify-center">
            <select
              className="border border-muted-foreground/20 rounded px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm bg-background max-w-[100px] sm:max-w-[120px] md:max-w-none truncate"
              value={currentCategoryIndex}
              onChange={(e) => handleCategoryChange(Number(e.target.value))}
            >
              {stockCategories.map((category, index) => (
                <option key={index} value={index}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Interval buttons */}
            <div className="flex gap-0.5 sm:gap-1">
              {intervals.map((item) => (
                <button
                  key={item.label}
                  className={clsx(
                    "px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-3 md:py-1 rounded text-xs font-light border border-muted-foreground/20 hover:bg-muted transition-colors min-w-[24px] sm:min-w-[28px]",
                    stockRange === item.range && stockInterval === item.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground"
                  )}
                  onClick={() => handleIntervalClick(item)}
                  aria-current={stockRange === item.range && stockInterval === item.value ? "page" : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Navigation buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentStockIndex === 0}
              aria-label="Previous stock"
              className="border-muted-foreground/20 h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentStockIndex === totalStocks - 1}
              aria-label="Next stock"
              className="border-muted-foreground/20 h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { StockChart, StockCarousel }
