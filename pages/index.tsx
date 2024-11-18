'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, X, Loader2, Maximize2, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  { label: 'W', value: 'weekly', interval: '1wk', range: '5y' },
  { label: 'M', value: 'monthly', interval: '1mo', range: 'max' },
];

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
    '--background': '#ffffff',
    '--foreground': '#000000',
    '--border': '#e5e7eb',
    '--success': '#089981',
    '--destructive': '#ef4444',
  };
  
  return fallbacks[variableName] || '#000000';
};

const getChartColors = () => ({
  upColor: getCssVariableColor('--success'),
  downColor: getCssVariableColor('--destructive'),
  backgroundColor: getCssVariableColor('--background'),
  textColor: getCssVariableColor('--foreground'),
  borderColor: getCssVariableColor('--border'),
});

export default function StockChart() {
  const [indexData] = useState<IndexData[]>([
    { label: 'Nifty 50', data: nifty50Data },
    { label: 'Nifty Next 50', data: niftyNext50Data },
    { label: 'Midcap 150', data: midcap150Data },
    { label: 'Smallcap 250', data: smallcap250Data },
    { label: 'MicroCap 250', data: microCap250Data },
  ]);
  
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
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();

  const getChartHeight = useCallback(() => {
    return window.innerWidth < 640 ? 700 : window.innerWidth < 1024 ? 320 : 800;
  }, []);

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

    const chartColors = getChartColors();

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(),
      layout: {
        background: { type: ColorType.Solid, color: chartColors.backgroundColor },
        textColor: chartColors.textColor,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        borderColor: chartColors.borderColor,
      },
      timeScale: {
        borderColor: chartColors.borderColor,
        timeVisible: false,
        rightOffset: 10,
        minBarSpacing: 3,
      },
    });

    chartInstanceRef.current = chart;

    const candlestickSeries = chart.addBarSeries({
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderVisible: false,
      wickUpColor: chartColors.upColor,
      wickDownColor: chartColors.downColor,
    });

    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: chartColors.upColor,
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
      color: d.close >= d.open ? chartColors.upColor : chartColors.downColor,
    } as HistogramData)));

    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      }
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, getChartHeight, theme]);

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
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) { // Safari
      (document.documentElement as any).webkitRequestFullscreen();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sticky Top Bar */}
      {/* Sticky Top Bar */}
<div className="sticky top-0 z-20 flex items-center justify-between bg-background/80 backdrop-blur-sm p-2 border-b space-x-2">
  {/* Brand Name */}
  <div className="text-lg font-bold mr-4">dotChart</div>

  {/* Right-side elements */}
  <div className="flex items-center space-x-2 flex-wrap">
    {/* Intervals Select Box */}
    <Select
      value={selectedInterval}
      onValueChange={(value) => setSelectedInterval(value)}
    >
      <SelectTrigger className="w-[70px] h-8 text-xs">
        <SelectValue placeholder="Interval" />
      </SelectTrigger>
      <SelectContent>
        {INTERVALS.map((interval) => (
          <SelectItem key={interval.value} value={interval.value} className="text-xs">
            {interval.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Search Box */}
    <div 
      className="relative" 
      ref={searchRef} 
      style={{
        width: 'calc(60vw - 120px)', // Adjusted width for better mobile responsiveness
        maxWidth: '150px'             // Ensuring a cap on the search box width
      }}
    >
      <Input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
        className="pr-6 text-sm h-8 bg-background/80 backdrop-blur-sm"
        aria-label="Search stocks"
      />
      {searchTerm ? (
        <X
          className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => {
            setSearchTerm('');
            setShowDropdown(false);
          }}
        />
      ) : (
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      )}
      {showDropdown && searchTerm && (
        <div className="absolute w-full mt-1 py-1 bg-background border border-slate-200/5 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 left-0">
          {filteredStocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => {
                const stockIndex = stocks.findIndex((s) => s.symbol === stock.symbol);
                setCurrentStockIndex(stockIndex);
                setSearchTerm('');
                setShowDropdown(false);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium text-sm">{stock.symbol}</div>
              <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Theme Toggle Button */}
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 p-0"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>

    {/* Full Screen Button (visible only on mobile) */}
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 p-0 sm:hidden"
      onClick={handleFullScreen}
    >
      <Maximize2 className="h-4 w-4" />
      <span className="sr-only">Full Screen</span>
    </Button>
  </div>
</div>


      <main className="flex-1 relative overflow-hidden">
        {/* Stock Info Overlay */}
        {currentStock && (
          <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm p-2 rounded-lg">
            <h2 className="text-md font-bold">{currentStock.symbol}</h2>
            <div className="text-sm">
              <span className={`text-[14px] font-medium ${
                currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {currentStock.price?.toFixed(2)}
              </span>
              <span className={`text-[14px] ml-1 ${
                currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {currentStock.todayChange && currentStock.todayChange >= 0 ? '↑' : '↓'} {Math.abs(currentStock.todayChange || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Chart Container */}
        <div className="h-full" ref={chartContainerRef}></div>
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-slate-200/5">
        <div className="mx-auto px-2 sm:px-4">
          <div className="flex justify-between py-2 sm:py-4 min-w-0">
            {/* Index Select Box */}
            <div className="flex-shrink-0 min-w-[120px] sm:min-w-[180px]">
              <Select
                value={selectedIndexId.toString()}
                onValueChange={(value) => setSelectedIndexId(parseInt(value))}
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder="Select Index" />
                </SelectTrigger>
                <SelectContent>
                  {indexData.map((item, index) => (
                    <SelectItem key={index} value={index.toString()} className="text-xs sm:text-sm">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pagination */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStockIndex === 0}
                className="h-8 px-1.5 sm:px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
              </Button>

              <div className="flex items-center min-w-[60px] justify-center">
                <span className="text-sm sm:text-sm text-gray-600 whitespace-nowrap">
                  <span className="font-medium">{currentStockIndex + 1}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-gray-400">{stocks.length}</span>
                </span>
              </div>

              <Button
                variant="ghost"
                onClick={handleNext}
                disabled={currentStockIndex === stocks.length - 1}
                className="h-8 px-1.5 sm:px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                size="sm"
              >
                <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
