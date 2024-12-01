'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { stockCategories } from '@/lib/stockList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Maximize, Minimize } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  symbol: string;
  interval: string;
  range: string;
}

const StockChart: React.FC<StockChartProps> = ({ symbol, interval, range }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const [data, setData] = useState<ChartData[]>([]);
  const [todayPrice, setTodayPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchData();
  }, [symbol, interval, range]);

  useEffect(() => {
    const initChart = () => {
      if (chartContainerRef.current && data.length > 0) {
        const chartOptions = {
          layout: {
            background: { type: ColorType.Solid, color: theme === 'dark' ? '#09090b' : 'white' },
            textColor: theme === 'dark' ? '#E5E7EB' : '#09090b',
          },
          timeScale: { timeVisible: true },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        };

        if (!chartRef.current) {
          chartRef.current = createChart(chartContainerRef.current, chartOptions);
          candlestickSeriesRef.current = chartRef.current.addBarSeries();
        }

        candlestickSeriesRef.current?.setData(data);

        if (data.length > 0) {
          const latestData = data[data.length - 1];
          setTodayPrice(latestData.close);
          const yesterdayClose = data[data.length - 2]?.close;
          if (yesterdayClose) {
            setPriceChange(((latestData.close - yesterdayClose) / yesterdayClose) * 100);
          }
        }
      }
    };

    initChart();
  }, [data, theme]);

  const fetchData = async () => {
    try {
      const response = await fetch(
        `/api/stock?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`
      );
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      console.error('Error fetching stock data:', err);
    }
  };

  return <div className="w-full h-full" ref={chartContainerRef}></div>;
};

interface StockCarouselProps {
  onCategoryChange: (index: number) => void;
  onRangeChange: (range: string) => void;
  currentCategoryIndex: number;
  range: string;
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
  const totalStocks = currentCategory.data.length;

  useEffect(() => {
    if (range === '1y') setInterval('1d');
    else if (range === '5y') setInterval('1wk');
    else setInterval('1mo');
  }, [range]);

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
        <StockChart
          symbol={currentCategory.data[currentStockIndex].Symbol}
          interval={interval}
          range={range}
        />
      </div>
      <div className="mt-2 p-3 bg-background border-t border-muted-foreground/20 flex justify-between items-center gap-4">
        {/* Pagination Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentStockIndex((prev) => (prev - 1 + totalStocks) % totalStocks)}
            disabled={currentStockIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentStockIndex((prev) => (prev + 1) % totalStocks)}
            disabled={currentStockIndex === totalStocks - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Selectors, Theme Toggle, and Fullscreen Button */}
        <div className="flex items-center gap-4">
          <Select
            value={currentCategoryIndex.toString()}
            onValueChange={(value) => onCategoryChange(parseInt(value))}
          >
            <SelectTrigger className="w-[130px]">
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
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1y">Daily</SelectItem>
              <SelectItem value="5y">Weekly</SelectItem>
              <SelectItem value="max">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { StockCarousel, StockChart };
