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
  { label: 'D', value: '1d', range: '6mo' },
  { label: 'W', value: '1wk', range: '2y' },
  { label: 'M', value: '1mo', range: '5y' }
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
  const priceChartContainerRef = useRef<HTMLDivElement>(null)
  const volumeChartContainerRef = useRef<HTMLDivElement>(null)
  const priceChartRef = useRef<IChartApi | null>(null)
  const volumeChartRef = useRef<IChartApi | null>(null)
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
      if (priceChartRef.current && priceChartContainerRef.current) {
        priceChartRef.current.applyOptions({ 
          width: priceChartContainerRef.current.clientWidth,
          height: priceChartContainerRef.current.clientHeight
        })
      }
      if (volumeChartRef.current && volumeChartContainerRef.current) {
        volumeChartRef.current.applyOptions({ 
          width: volumeChartContainerRef.current.clientWidth,
          height: volumeChartContainerRef.current.clientHeight
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

    const initCharts = () => {
      if (priceChartContainerRef.current && volumeChartContainerRef.current && data.length > 0) {
        const commonOptions = {
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
            minBarSpacing: 4,
          },
        }

        // Remove any existing chart instances
        if (priceChartRef.current) {
          priceChartRef.current.remove()
          priceChartRef.current = null
        }
        if (volumeChartRef.current) {
          volumeChartRef.current.remove()
          volumeChartRef.current = null
        }

        // Create price chart
        priceChartRef.current = createChart(priceChartContainerRef.current, {
          ...commonOptions,
          width: priceChartContainerRef.current.clientWidth,
          height: priceChartContainerRef.current.clientHeight,
        })

        // Create volume chart
        volumeChartRef.current = createChart(volumeChartContainerRef.current, {
          ...commonOptions,
          width: volumeChartContainerRef.current.clientWidth,
          height: volumeChartContainerRef.current.clientHeight,
        })

        // Candlestick series on price chart
        candlestickSeriesRef.current = priceChartRef.current.addBarSeries({
          upColor: '#089981',
          downColor: '#f23645',
        })
        candlestickSeriesRef.current.setData(data)

        // 10-period Moving Average on price chart
        const maData = calculateMovingAverage(data, maLength)
        maSeriesRef.current = priceChartRef.current.addLineSeries({
          color: '#eab308', // yellow
          lineWidth: 1,
          priceLineVisible: false
        })
        maSeriesRef.current.setData(maData)

        // Volume series on volume chart
        const volumeData = data.map(item => ({
          time: item.time,
          value: item.volume,
          color: item.close >= item.open ? '#089981' : '#f23645'
        }))
        
        volumeSeriesRef.current = volumeChartRef.current.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceLineVisible: false,
          lastValueVisible: false,
        })
        volumeSeriesRef.current.setData(volumeData)

        // Synchronize time scales
        priceChartRef.current.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
          if (volumeChartRef.current && timeRange) {
            volumeChartRef.current.timeScale().setVisibleRange(timeRange)
          }
        })

        volumeChartRef.current.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
          if (priceChartRef.current && timeRange) {
            priceChartRef.current.timeScale().setVisibleRange(timeRange)
          }
        })

        // Fit content for both charts
        priceChartRef.current.timeScale().fitContent()
        volumeChartRef.current.timeScale().fitContent()

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

    initCharts()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (priceChartRef.current) {
        priceChartRef.current.remove()
        priceChartRef.current = null
      }
      if (volumeChartRef.current) {
        volumeChartRef.current.remove()
        volumeChartRef.current = null
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
    <div className="w-full h-full relative flex flex-col">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="absolute top-0 left-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg p-1">
            <h3 className="text-md font-semibold">{symbol}</h3>
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
          
          {/* Price Chart - Takes up 70% of the height */}
          <div ref={priceChartContainerRef} className="w-full flex-grow" style={{ height: '70%' }} />
          
          {/* Volume Chart - Takes up 30% of the height */}
          <div ref={volumeChartContainerRef} className="w-full flex-shrink-0" style={{ height: '30%' }} />
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
    // Consistent sizing regardless of orientation
    <div className="w-full h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full h-4/5 border border-muted-foreground/10 bg-background shadow-sm overflow-hidden rounded-lg">
        {/* Chart and footer components */}
        <div className="flex flex-col h-full">
          {/* Top controls - consistent padding */}
          <div className="bg-background border-b border-muted-foreground/10 p-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={toggleFullscreen} 
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="h-3 w-4" /> : <Maximize2 className="h-3 w-4" />}
                </Button>
              </div>

              <select
                className="border border-muted-foreground/20 rounded px-3 py-2 text-sm bg-background"
                value={currentCategoryIndex}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
              >
                {stockCategories.map((category, index) => (
                  <option key={index} value={index}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                {intervals.map((item) => (
                  <button
                    key={item.label}
                    className={clsx(
                      "px-4 py-2 rounded text-sm font-medium border border-muted-foreground/20 hover:bg-muted transition-colors",
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
          </div>

          <div className="flex-grow overflow-hidden p-2">
            <StockChart symbol={currentStock.Symbol} interval={stockInterval} range={stockRange} />
          </div>
          
          {/* Footer controls - consistent padding */}
          <div className="bg-background border-t border-muted-foreground/10 p-2 flex-shrink-0">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStockIndex === 0}
                aria-label="Previous stock"
                className="border-muted-foreground/20 flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentStockIndex === totalStocks - 1}
                aria-label="Next stock"
                className="border-muted-foreground/20 flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { StockChart, StockCarousel }
