use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, X, Menu, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { indexData, INTERVALS, RANGES, STOCKS_PER_PAGE } from '@/lib/constants';
import { Stock, CurrentStock, ChartDataPoint } from '@/lib/types';
import { getCssVariableColor, getChartColors } from '@/lib/utils';


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
  const [selectedRange, setSelectedRange] = useState('1y');
  const [currentStock, setCurrentStock] = useState<CurrentStock | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const getChartHeight = useCallback(() => {
    return window.innerWidth < 640 ? 620 : window.innerWidth < 1024 ? 300 : 700;
  }, []);

  useEffect(() => {
    const selectedIndex = indexData[selectedIndexId];
    const stocksList = selectedIndex.data.map(item => ({
      symbol: item.Symbol,
      name: item["Company Name"]
    }));
    setStocks(stocksList);
    setCurrentStockIndex(0);
    setCurrentPage(1);
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
          range: selectedRange,
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
  }, [stocks, currentStockIndex, selectedInterval, selectedRange]);

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
        minBarSpacing: 2,
      },
    });

    chartInstanceRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
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
  }, [chartData, getChartHeight]);

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

  const totalPages = Math.ceil(stocks.length / STOCKS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setCurrentStockIndex((newPage - 1) * STOCKS_PER_PAGE);
  };

  const displayedStocks = stocks.slice(
    (currentPage - 1) * STOCKS_PER_PAGE,
    currentPage * STOCKS_PER_PAGE
  );

 return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">StockViz</h1>
        </div>
        <div className="relative" ref={searchRef}>
          <Input
            type="text"
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            className="w-64"
          />
          <AnimatePresence>
            {showDropdown && filteredStocks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg"
              >
                {filteredStocks.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="p-2 hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setCurrentStockIndex(stocks.findIndex(s => s.symbol === stock.symbol));
                      setSearchTerm('');
                      setShowDropdown(false);
                    }}
                  >
                    <div className="font-medium">{stock.symbol}</div>
                    <div className="text-sm text-muted-foreground">{stock.name}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col">
        <Tabs defaultValue="chart" className="flex-1 flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="flex-1">
            {currentStock && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center justify-between"
              >
                <div>
                  <h2 className="text-2xl font-bold">{currentStock.symbol}</h2>
                  <p className="text-sm text-muted-foreground">{currentStock.name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-semibold ${
                    currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {currentStock.price?.toFixed(2)}
                  </p>
                  <div className={`flex items-center justify-end text-lg ${
                    currentStock.todayChange && currentStock.todayChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {currentStock.todayChange && currentStock.todayChange >= 0 ? (
                      <ArrowUpRight className="h-5 w-5 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 mr-1" />
                    )}
                    <span>{Math.abs(currentStock.todayChange || 0).toFixed(2)}%</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div className="flex-1" ref={chartContainerRef}></div>
          </TabsContent>
          <TabsContent value="overview">
            {/* Add an overview tab with additional stock information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Company Info</h3>
                <p>{currentStock?.name}</p>
                {/* Add more company information here */}
              </div>
              <div className="bg-card p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Key Statistics</h3>
                {/* Add key statistics here */}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-background/80 backdrop-blur-sm border-t border-border p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {INTERVALS.map((interval) => (
              <Button
                key={interval.value}
                variant={selectedInterval === interval.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedInterval(interval.value)}
              >
                {interval.label}
              </Button>
            ))}
          </div>
          <div className="flex space-x-2">
            {RANGES.map((range) => (
              <Button
                key={range.value}
                variant={selectedRange === range.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Select
            value={selectedIndexId.toString()}
            onValueChange={(value) => setSelectedIndexId(parseInt(value))}
          >
            <SelectTrigger className="w-[200px]">
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
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
