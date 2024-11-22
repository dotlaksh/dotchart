'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, X, Loader2, Maximize2, Minimize2, Moon, Sun, Info, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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
  { label: '1D', value: 'daily', interval: '1d', range: '2y' },
  { label: '1W', value: 'weekly', interval: '1wk', range: '5y' },
  { label: '1M', value: 'monthly', interval: '1mo', range: 'max' },
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

const getChartColors = (isDark: boolean) => ({
  upColor: isDark ? '#26a69a' : '#089981',
  downColor: isDark ? '#ef5350' : '#ef4444',
  backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
  textColor: isDark ? '#d4d4d4' : '#1e1e1e',
  borderColor: isDark ? '#333333' : '#e5e7eb',
});

export default function ModernStockChart() {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

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
          height: chartContainerRef.current!.clientHeight,
        });
      }
    };

    const isDark = theme === 'dark';
    const chartColors = getChartColors(isDark);

    // Add chart title
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: chartColors.backgroundColor },
        textColor: chartColors.textColor,
      },
      grid: {
        vertLines: { color: chartColors.borderColor, style: 1, visible: true },
        horzLines: { color: chartColors.borderColor, style: 1, visible: true },
      },
      rightPriceScale: {
        borderColor: chartColors.borderColor,
      },
      timeScale: {
        borderColor: chartColors.borderColor,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
      },
    });

    chart.applyOptions({
      watermark: {
        color: 'rgba(11, 94, 29, 0.4)',
        visible: true,
        text: 'dotChart',
        fontSize: 24,
        horzAlign: 'left',
        vertAlign: 'bottom',
      },
    });

    chartInstanceRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: chartColors.upColor,
      downColor: chartColors.downColor,
      borderVisible: true,
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
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
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
  }, [chartData, theme]);

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
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sticky Top Bar */}
      {!isFullscreen && (
        <div className="sticky top-0 z-20 flex items-center justify-between bg-background/80 backdrop-blur-sm p-2 sm:p-4 border-b">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">dotChart</h1>
            <div className="hidden sm:block">
              <Select
                value={selectedIndexId.toString()}
                onValueChange={(value) => setSelectedIndexId(parseInt(value))}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm bg-background">
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
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="relative hidden sm:block" ref={searchRef}>
              <Input
                type="text"
                placeholder="Search stocks..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-40 sm:w-64 pr-8 text-xs sm:text-sm h-8 sm:h-9 bg-background/80 backdrop-blur-sm"
                aria-label="Search stocks"
              />
              {searchTerm ? (
                <X
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => {
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
                />
              ) : (
                <Search className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground" />
              )}
              {showDropdown && searchTerm && (
                <Card className="absolute w-full mt-1 z-50">
                  <ScrollArea className="h-[200px] sm:h-[300px]">
                    {filteredStocks.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => {
                          const stockIndex = stocks.findIndex((s) => s.symbol === stock.symbol);
                          setCurrentStockIndex(stockIndex);
                          setSearchTerm('');
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-xs sm:text-sm">{stock.symbol}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">{stock.name}</div>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs">{indexData[selectedIndexId].label}</Badge>
                      </button>
                    ))}
                  </ScrollArea>
                </Card>
              )}
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFullScreen}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Sun className="h-[1rem] w-[1rem] sm:h-[1.2rem] sm:w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1rem] w-[1rem] sm:h-[1.2rem] sm:w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle theme</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px] sm:w-[300px]">
                <div className="py-4">
                  <h2 className="text-lg font-semibold mb-4">Menu</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="mobileIndexSelect" className="block text-sm font-medium mb-1">Select Index</label>
                      <Select
                        value={selectedIndexId.toString()}
                        onValueChange={(value) => {
                          setSelectedIndexId(parseInt(value));
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <SelectTrigger id="mobileIndexSelect" className="w-full">
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
                    </div>
                    <div>
                      <label htmlFor="mobileSearch" className="block text-sm font-medium mb-1">Search Stocks</label>
                      <Input
                        id="mobileSearch"
                        type="text"
                        placeholder="Search stocks..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowDropdown(true);
                        }}
                        className="w-full"
                      />
                    </div>
                    {showDropdown && searchTerm && (
                      <ScrollArea className="h-[200px] border rounded-md">
                        {filteredStocks.map((stock) => (
                          <button
                            key={stock.symbol}
                            onClick={() => {
                              const stockIndex = stocks.findIndex((s) => s.symbol === stock.symbol);
                              setCurrentStockIndex(stockIndex);
                              setSearchTerm('');
                              setShowDropdown(false);
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">{stock.symbol}</div>
                              <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                            </div>
                            <Badge variant="outline" className="ml-2">{indexData[selectedIndexId].label}</Badge>
                          </button>
                        ))}
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">
        {/* Stock Info Overlay */}
        {currentStock && (
          <Card className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:w-auto z-10 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <h2 className="text-base sm:text-xl font-bold">{currentStock.symbol}</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0" onClick={() => setShowInfo(!showInfo)}>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle stock info</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-lg sm:text-2xl font-semibold">
                ₹{currentStock.price?.toFixed(2)}
                <span className={`text-xs sm:text-sm ml-1 sm:ml-2 ${
                  currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {currentStock.todayChange && currentStock.todayChange >= 0 ? '▲' : '▼'} {Math.abs(currentStock.todayChange || 0).toFixed(2)}%
                </span>
              </div>
              {showInfo && (
                <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <p><span className="font-medium">Open:</span> ₹{chartData[chartData.length - 1]?.open.toFixed(2)}</p>
                  <p><span className="font-medium">High:</span> ₹{chartData[chartData.length - 1]?.high.toFixed(2)}</p>
                  <p><span className="font-medium">Low:</span> ₹{chartData[chartData.length - 1]?.low.toFixed(2)}</p>
                  <p><span className="font-medium">Volume:</span> {chartData[chartData.length - 1]?.volume.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart Container */}
        <AspectRatio ratio={16 / 9} className="w-full h-full min-h-[300px] sm:min-h-[400px] lg:min-h-[600px]">
          <div className="w-full h-full" ref={chartContainerRef}></div>
        </AspectRatio>

        {loading && (
          <div className="absolute inset-0 flex justify-center items-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-primary"/>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex justify-center items-center bg-background/50 backdrop-blur-sm">
            <Card className="p-2 sm:p-4 max-w-[280px] sm:max-w-md">
              <CardContent>
                <h3 className="text-base sm:text-lg font-semibold text-destructive mb-1 sm:mb-2">Error</h3>
                <p className="text-sm">{error}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
        <div className="mx-auto px-2 sm:px-4">
          <div className="flex justify-between py-2 sm:py-4 items-center">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStockIndex === 0}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                size="sm"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <span className="text-xs sm:text-sm font-medium">
                {currentStockIndex + 1} / {stocks.length}
              </span>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentStockIndex === stocks.length - 1}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                size="sm"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0 sm:ml-1" />
              </Button>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              {INTERVALS.map((interval) => (
                <Button
                  key={interval.value}
                  variant={selectedInterval === interval.value ? "default" : "outline"}
                  onClick={() => setSelectedInterval(interval.value)}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                  size="sm"
                >
                  {interval.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

