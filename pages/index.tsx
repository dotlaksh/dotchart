'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { ChevronLeft, ChevronRight, Search, X, Loader2, Maximize2, Minimize2, Focus, ZoomIn } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import nifty50Data from '../public/nifty50.json';
import niftyNext50Data from '../public/niftynext50.json';
import midcap150Data from '../public/midcap150.json';
import smallcap250Data from '../public/smallcap250.json';
import microCap250Data from '../public/microcap250.json';

interface StockData {
  Symbol: string;
  "Company Name": string;
}

interface Stock {
  symbol: string;
  name: string;
}

interface IndexData {
  label: string;
  data: StockData[];
}

interface CurrentStock extends Stock {
  price?: number;
  change?: number;
  todayChange?: number;
}

interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVALS = [
  { label: 'D', value: 'daily', interval: '1d', range: '2y' },
  { label: 'W', value: 'weekly', interval: '1wk', range: 'max' },
  { label: 'M', value: 'monthly', interval: '1mo', range: 'max' },
];
const getPerformanceColor = (change: number): string => {
  if (change > 5) return '#22c55e';
  if (change > 0) return '#4ade80';
  if (change < -5) return '#ef4444';
  if (change < 0) return '#f87171';
  return '#94a3b8';
};
const getCssVariableColor = (variableName: string): string => {
  if (typeof window === 'undefined') return '#000000';
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  const cssVariable = computedStyle.getPropertyValue(variableName).trim();
  
  if (cssVariable.startsWith('#') || cssVariable.startsWith('rgb')) {
    return cssVariable;
  }
  
  const cssValues = cssVariable.split(',').map(v => v.trim());
  if (cssValues.length === 3 && cssValues.every(v => !isNaN(Number(v)))) {
    return `hsl(${cssValues.join(',')})`;
  }
  
  const fallbacks: Record<string, string> = {
    '--background': '#1e1e1e',
    '--foreground': '#ffffff',
    '--border': '#333333',
    '--success': '#26a69a',
    '--destructive': '#ef5350',
  };
  
  return fallbacks[variableName] || '#ffffff';
};

const getChartColors = () => ({
  upColor: '#26a69a',
  downColor: '#ef5350',
  backgroundColor: '#1e1e1e',
  textColor: '#d4d4d4',
  borderColor: '#333333',
});

export default function StockChart() {
  const [indexData] = useState<IndexData[]>([
    { label: 'Nifty 50', data: nifty50Data },
    { label: 'Nifty Next 50', data: niftyNext50Data },
    { label: 'Midcap 150', data: midcap150Data },
    { label: 'Smallcap 250', data: smallcap250Data },
    { label: 'MicroCap 250', data: microCap250Data },
  ]);
  const [focusMode, setFocusMode] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [selectedIndexId, setSelectedIndexId] = useState(0);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('daily');
  const [currentStock, setCurrentStock] = useState<CurrentStock | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

 const getChartHeight = useCallback(() => {
    const height = window.innerHeight;
    return focusMode ? height : Math.max(height * 0.6, 300);
  }, [focusMode]);

  useEffect(() => {
    const selectedIndex = indexData[selectedIndexId];
    const stocksList = selectedIndex.data.map(item => ({
      symbol: item.Symbol,
      name: item["Company Name"]
    }));
    setStocks(stocksList);
    setCurrentStockIndex(0);
  }, [selectedIndexId, indexData]);

  const fetchStockData = useCallback(async () => {
    if (!stocks.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentStock = stocks[currentStockIndex];
      const interval = INTERVALS.find(i => i.value === selectedInterval);

      if (!interval) throw new Error('Invalid interval');

      const response = await axios.get<ChartDataPoint[]>('/api/stockData', {
        params: {
          symbol: currentStock.symbol,
          range: interval.range,
          interval: interval.interval
        }
      });

      if (response.data && Array.isArray(response.data)) {
        setChartData(response.data);
        setCurrentStock({
          ...currentStock,
          price: response.data[response.data.length - 1]?.close,
          change: ((response.data[response.data.length - 1]?.close - response.data[0]?.open) / response.data[0]?.open) * 100,
          todayChange: ((response.data[response.data.length - 1]?.close - response.data[response.data.length - 2]?.close) / response.data[response.data.length - 2]?.close) * 100
        });
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }, [stocks, currentStockIndex, selectedInterval]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentStockIndex < stocks.length - 1) {
      setAnimationDirection('left');
      setCurrentStockIndex(prev => prev + 1);
    } else if (direction === 'right' && currentStockIndex > 0) {
      setAnimationDirection('right');
      setCurrentStockIndex(prev => prev - 1);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left'),
    onSwipedRight: () => handleSwipe('right'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const toggleFocusMode = () => {
    setFocusMode(prev => !prev);
  };

  useEffect(() => {
    if (!chartContainerRef.current || !chartData.length) return;

    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current!.clientWidth,
          height: getChartHeight(),
        });
      }
    };

    const performanceColor = getPerformanceColor(currentStock?.change || 0);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(),
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: performanceColor,
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: performanceColor,
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: performanceColor,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeriesRef.current = volumeSeries;

    candlestickSeries.setData(chartData as CandlestickData[]);
    volumeSeries.setData(chartData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? performanceColor : '#ef4444',
    } as HistogramData)));

    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, getChartHeight, currentStock]);

  const handleIntervalChange = (newInterval: string) => {
    setSelectedInterval(newInterval);
  };

  const handlePrevious = () => {
    if (currentStockIndex > 0) {
      setCurrentStockIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStockIndex < stocks.length - 1) {
      setCurrentStockIndex(prev => prev + 1);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStocks = stocks.filter(stock => 
    searchTerm && (
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 10);

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    setMounted(true);
    setTheme('dark');
  }, [setTheme]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100" {...swipeHandlers}>
      <header className="sticky top-0 z-20 bg-gray-800 p-4 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            InnoStock
          </h1>
          <div className="relative w-full max-w-md mx-4">
            <Input
              type="text"
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 border-gray-600 focus:border-blue-500 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFocusMode}
            className="text-gray-300 hover:text-gray-100"
          >
            {focusMode ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStockIndex}
            initial={{ opacity: 0, x: animationDirection === 'left' ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: animationDirection === 'left' ? -50 : 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {currentStock && (
              <div className="absolute top-4 left-4 z-10 bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold">{currentStock.symbol}</h2>
                <p className="text-lg">{currentStock.name}</p>
                <div className="mt-2">
                  <span className={`text-2xl font-semibold ${
                    currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentStock.price?.toFixed(2)}
                  </span>
                  <span className={`ml-2 ${
                    currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentStock.todayChange && currentStock.todayChange >= 0 ? '▲' : '▼'} {Math.abs(currentStock.todayChange || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            <div className="h-full" ref={chartContainerRef}></div>
          </motion.div>
        </AnimatePresence>
        {loading && (
          <div className="absolute inset-0 flex justify-center items-center bg-gray-900/50 backdrop-blur-sm">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex justify-center items-center bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg">
              {error}
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-gray-800 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <Select
            value={selectedIndexId.toString()}
            onValueChange={(value) => setSelectedIndexId(parseInt(value))}
          >
            <SelectTrigger className="w-[180px] bg-gray-700 text-gray-100 border-gray-600">
              <SelectValue placeholder="Select Index" />
            </SelectTrigger>
            <SelectContent>
              {indexData.map((item, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex space-x-2">
            {INTERVALS.map((interval) => (
              <Button
                key={interval.value}
                variant={selectedInterval === interval.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedInterval(interval.value)}
                className={selectedInterval === interval.value ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}
              >
                {interval.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentStockIndex === 0}
              className="text-gray-300 hover:text-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="text-gray-300">
              {currentStockIndex + 1} / {stocks.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentStockIndex === stocks.length - 1}
              className="text-gray-300 hover:text-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
