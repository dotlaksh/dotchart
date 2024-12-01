'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,Maximize2, Minimize2 } from 'lucide-react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { useTheme } from "next-themes"
import { stockCategories } from '@/lib/stockList'
import { Moon, Sun } from 'lucide-react'

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

// Add ThemeToggle component
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

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
            rightOffset: 10,
            minBarSpacing: 3,
          },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
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
          scaleMargins: {
            top: 0.2,
            bottom: 0.2,
          }
        });
        chartRef.current.timeScale().fitContent();

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
    <div className="w-full h-full relative" ref={chartContainerRef}>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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

interface StockCarouselProps {
  onCategoryChange: (index: number) => void;
  onRangeChange: (range: string) => void;
  currentCategoryIndex: number;
  range: string;
}

interface StockData {
  "Company Name": string;
  Symbol: string;
  PercentChange?: number; // Make this optional
}

const StockCarousel: React.FC<StockCarouselProps> = ({
  onCategoryChange,
  onRangeChange,
  currentCategoryIndex,
  range,
}) => {
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [interval, setInterval] = useState<string>('1d');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentCategory = stockCategories[currentCategoryIndex];
  const currentStock = {
    ...currentCategory.data[currentStockIndex],
    percentChange: (currentCategory.data[currentStockIndex] as StockData).PercentChange ?? (Math.random() * 10 - 5),
  };
  const totalStocks = currentCategory.data.length;

  useEffect(() => {
    if (range === '1y') {
      setInterval('1d');
    } else if (range === '5y') {
      setInterval('1wk');
    } else if (range === 'max') {
      setInterval('1mo');
    }
  }, [range]);

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden">
        <StockChart symbol={currentStock.Symbol} interval={interval} range={range} />
      </div>
      <div className="mt-2 p-3 bg-background border-t border-muted-foreground/20 flex justify-between items-center gap-4">
  {/* Left-side controls */}
  <div className="flex items-center gap-4">
    <Select
      value={currentCategoryIndex.toString()}
      onValueChange={(value) => handleCategoryChange(parseInt(value))}
    >
      <SelectTrigger className="w-[120px] border-[1px]">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {stockCategories.map((category, index) => (
          <SelectItem key={index} value={index.toString()}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={range} onValueChange={onRangeChange}>
      <SelectTrigger className="w-[80px] border-[1px]">
        <SelectValue placeholder="Range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1y">Daily</SelectItem>
        <SelectItem value="5y">Weekly</SelectItem>
        <SelectItem value="max">Monthly</SelectItem>
      </SelectContent>
    </Select>
    <ThemeToggle />
    <Button 
    variant="outline" 
    size="icon" 
    onClick={toggleFullscreen} 
    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
  >
    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
  </Button>
  </div>

  {/* Right-side pagination controls */}
  <div className="flex items-center gap-2 ml-auto">
    <Button
      variant="outline"
      size="icon"
      onClick={handlePrevious}
      disabled={currentStockIndex === 0}
      aria-label="Previous stock"
      className="border-muted-foreground/20"
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      onClick={handleNext}
      disabled={currentStockIndex === totalStocks - 1}
      aria-label="Next stock"
      className="border-muted-foreground/20"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
</div>
    </div>
  );
};

export { StockChart, StockCarousel }
