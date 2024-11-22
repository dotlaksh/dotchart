import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, X, Loader2, Menu, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  { label: '1D', value: 'daily', interval: '1d', range: 'max' },
  { label: '1W', value: 'weekly', interval: '1wk',range:'max' },
  { label: '1M', value: 'monthly', interval: '1mo', range: 'max' },
];

const CHART_COLORS = {
  upColor: '#16a34a',
  downColor: '#dc2626',
  backgroundColor: 'transparent',
  textColor: '#1e293b',
  gridColor: 'rgba(0, 0, 0, 0.1)',
};

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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

      let range = interval.range || 'max';
      
      // For weekly interval, calculate the range to get approximately 5 years of data
      if (interval.interval === '1wk') {
        const weeksIn5Years = 5 * 52;
        range = `${weeksIn5Years}wk`;
      }

      const response = await axios.get<ChartDataPoint[]>('/api/stockData', {
        params: {
          symbol: currentStock.symbol,
          range: range,
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
  }, [fetchStockData, currentStockIndex]);

  const createOrUpdateChart = useCallback(() => {
    if (!chartContainerRef.current || !chartData.length) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.backgroundColor },
        textColor: CHART_COLORS.textColor,
      },
      grid: {
        vertLines: { color: CHART_COLORS.gridColor },
        horzLines: { color: CHART_COLORS.gridColor },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.gridColor,
      },
      timeScale: {
        borderColor: CHART_COLORS.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderVisible: false,
      wickUpColor: CHART_COLORS.upColor,
      wickDownColor: CHART_COLORS.downColor,
    });

    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: CHART_COLORS.upColor,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeriesRef.current = volumeSeries;

    // Filter out any data points with null values
    const validChartData = chartData.filter(d => 
      d.open !== null && d.high !== null && d.low !== null && d.close !== null
    );

    candlestickSeries.setData(validChartData as CandlestickData[]);
    volumeSeries.setData(validChartData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? CHART_COLORS.upColor : CHART_COLORS.downColor,
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

    // Force a resize of the chart
    setTimeout(() => {
      if (chartInstanceRef.current && chartContainerRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    }, 0);
  }, [chartData]);

  useEffect(() => {
    if (activeTab === 'chart' && chartData.length > 0) {
      createOrUpdateChart();
    }
  }, [activeTab, createOrUpdateChart, chartData]);

  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current && chartContainerRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleStockSelection = (stockIndex: number) => {
    setCurrentStockIndex(stockIndex);
    setSearchTerm('');
    setShowDropdown(false);
    setActiveTab('chart');
    fetchStockData();
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
    searchTerm === '' || 
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">StockVue</h1>
      </header>

      <main className="flex-grow overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-80 border-r hidden lg:block overflow-y-auto">
            <div className="p-4 space-y-4">
              <Select
                value={selectedIndexId.toString()}
                onValueChange={(value) => setSelectedIndexId(parseInt(value))}
              >
                <SelectTrigger>
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
              <div className="relative" ref={searchRef}>
                <Input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {showDropdown && (
                <Card>
                  <ScrollArea className="h-[300px]">
                    {filteredStocks.map((stock, index) => (
                      <Button
                        key={stock.symbol}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleStockSelection(stocks.findIndex((s) => s.symbol === stock.symbol))}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{stock.symbol}</span>
                          <span className="text-sm text-muted-foreground">{stock.name}</span>
                        </div>
                      </Button>
                    ))}
                  </ScrollArea>
                </Card>
              )}
            </div>
          </aside>

          {/* Chart and Info */}
          <div className="flex-grow p-4 overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStock && (
                <motion.div
                  key={currentStock.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className
="mb-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h2 className="text-xl font-bold">{currentStock.symbol}</h2>
                          <p className="text-sm text-muted-foreground">{currentStock.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">₹{currentStock.price?.toFixed(2)}</p>
                          <Badge 
                            variant={currentStock.todayChange && currentStock.todayChange >= 0 ? "default" : "destructive"} 
                            className="text-sm px-2 py-0.5"
                          >
                            {currentStock.todayChange && currentStock.todayChange >= 0 ? (
                              <ArrowUpRight className="inline mr-1 h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="inline mr-1 h-3 w-3" />
                            )}
                            {Math.abs(currentStock.todayChange || 0).toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Open</p>
                          <p className="font-medium">
                            {chartData[chartData.length - 1]?.open !== null 
                              ? `₹${chartData[chartData.length - 1].open.toFixed(2)}` 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Close</p>
                          <p className="font-medium">
                            {chartData[chartData.length - 1]?.close !== null 
                              ? `₹${chartData[chartData.length - 1].close.toFixed(2)}` 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">High</p>
                          <p className="font-medium">
                            {chartData[chartData.length - 1]?.high !== null 
                              ? `₹${chartData[chartData.length - 1].high.toFixed(2)}` 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Low</p>
                          <p className="font-medium">
                            {chartData[chartData.length - 1]?.low !== null 
                              ? `₹${chartData[chartData.length - 1].low.toFixed(2)}` 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="chart" className="w-full" onValueChange={(value) => setActiveTab(value)}>
                  <TabsList className="w-full justify-start rounded-none border-b flex items-center">
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <div className="ml-auto">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9 lg:hidden">
                            <Menu className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px]">
                          <nav className="flex flex-col h-full">
                            <h2 className="font-semibold mb-4">Menu</h2>
                            <div className="space-y-4 flex-grow">
                              <div>
                                <label htmlFor="mobileIndexSelect" className="block text-sm font-medium mb-1">Select Index</label>
                                <Select
                                  value={selectedIndexId.toString()}
                                  onValueChange={(value) => setSelectedIndexId(parseInt(value))}
                                >
                                  <SelectTrigger id="mobileIndexSelect">
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
                                <div className="relative">
                                  <Input
                                    id="mobileSearch"
                                    type="text"
                                    placeholder="Search stocks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => setShowDropdown(true)}
                                  />
                                  {searchTerm && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full"
                                      onClick={() => setSearchTerm('')}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {showDropdown && (
                                <Card>
                                  <ScrollArea className="h-[300px]">
                                    {filteredStocks.map((stock, index) => (
                                      <Button
                                        key={stock.symbol}
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => handleStockSelection(stocks.findIndex((s) => s.symbol === stock.symbol))}
                                      >
                                        <div className="flex flex-col items-start">
                                          <span className="font-medium">{stock.symbol}</span>
                                          <span className="text-sm text-muted-foreground">{stock.name}</span>
                                        </div>
                                      </Button>
                                    ))}
                                  </ScrollArea>
                                </Card>
                              )}
                            </div>
                          </nav>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </TabsList>
                  <TabsContent value="chart" className="p-4">
                    <div className="h-[400px]" ref={chartContainerRef}></div>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="space-x-2">
                        {INTERVALS.map((interval) => (
                          <Button
                            key={interval.value}
                            variant={selectedInterval === interval.value ? "default" : "outline"}
                            onClick={() => setSelectedInterval(interval.value)}
                            size="sm"
                          >
                            {interval.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevious}
                          disabled={currentStockIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNext}
                          disabled={currentStockIndex === stocks.length - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="overview" className="p-6">
                    <p>Overview content here...</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {loading && (
        <div className="absolute inset-0 flex justify-center items-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="animate-spin h-8 w-8 text-primary"/>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex justify-center items-center bg-background/50 backdrop-blur-sm">
          <Card className="p-4 max-w-md">
            <CardContent>
              <h3 className="text-lg font-semibold text-destructive mb-2">Error</h3>
              <p>{error}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

