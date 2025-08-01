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
  { label: 'D', value: '1d', range: '1y' },
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
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
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
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        }

        // Remove any existing chart instance before creating a new one
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }

        chartRef.current = createChart(chartContainerRef.current, chartOptions)

        // Candlestick series on main pane
        candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: '#089981',
          downColor: '#f23645',
          borderVisible: false,
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
        })
        candlestickSeriesRef.current.setData(data)

        // Volume series on separate pane at bottom
        volumeSeriesRef.current = chartRef.current.addHistogramSeries({
          color: theme === 'dark' ? '#4B5563' : '#9CA3AF',
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
            color: isUp ? '#089981' : '#f23645'
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
    <div className="mt-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="mt-5 mb-5">
          <div className="flex flex-col h-[500px]">
            <div className="flex-grow overflow-hidden mb-2">
              <StockChart symbol={currentStock.Symbol} interval={stockInterval} range={stockRange} />
            </div>
            
            {/* Single row layout for all controls */}
            <div className="bg-background border-muted-foreground/20">
              <div className="flex items-center justify-between">
                {/* Left side - Theme toggle and fullscreen (hide fullscreen on small screens) */}
        

                {/* Center - Category selector and interval buttons */}
                <div className="flex gap-2">
                  <select
                    className="border border-muted-foreground/20 rounded py-1 text-xs bg-background"
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
                  <div className="flex gap-1">
                    {intervals.map((item) => (
                      <button
                        key={item.label}
                        className={clsx(
                          "px-3 py-1 rounded text-xs font-light border border-muted-foreground/20 hover:bg-muted transition-colors",
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

                {/* Right side - Navigation buttons (reduced size) */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStockIndex === 0}
                    aria-label="Previous stock"
                    className="border-muted-foreground/20 px-2 py-1 h-7 text-xs"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStockIndex === totalStocks - 1}
                    aria-label="Next stock"
                    className="border-muted-foreground/20 px-2 py-1 h-7 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { StockChart, StockCarousel }
