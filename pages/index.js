'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import nifty50Data from '/public/nifty50.json';
import niftyNext50Data from '/public/niftynext50.json';
import midcap150Data from '/public/midcap150.json';
import smallcap250Data from '/public/smallcap250.json';
import microCap250Data from '/public/microcap250.json';

const TIME_PERIODS = [
  { label: '1M', range: '1mo' },
  { label: '6M', range: '6mo' },
  { label: '1Y', range: '1y' },
  { label: '5Y', range: '5y' },
  { label: 'Max', range: 'max' },
];

const INTERVALS = [
  { label: 'D', value: '1d' },
  { label: 'W', value: '1wk' },
  { label: 'M', value: '1mo' },
];

const StockChart = () => {
  const [indexData] = useState([
    { label: 'Nifty 50', data: nifty50Data },
    { label: 'Nifty Next 50', data: niftyNext50Data },
    { label: 'Midcap 150', data: midcap150Data },
    { label: 'Smallcap 250', data: smallcap250Data },
    { label: 'MicroCap 250', data: microCap250Data },
  ]);
  const [selectedIndexId, setSelectedIndexId] = useState(0);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [stocks, setStocks] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [selectedInterval, setSelectedInterval] = useState('1d');
  const [currentStock, setCurrentStock] = useState(null);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const searchRef = useRef(null);

  // Handle click outside search box to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearching(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search input changes
  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.trim() === '') {
      setFilteredStocks([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchResults = stocks
      .filter(stock =>
        stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
        stock.name.toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 5);
    setFilteredStocks(searchResults);
  };

  // Handle stock selection from search results
  const handleSelectStock = (stockIndex) => {
    setCurrentStockIndex(stockIndex);
    setSearchTerm('');
    setIsSearching(false);
    setFilteredStocks([]);
  };

  // Populate stocks when an index is selected
  useEffect(() => {
    const selectedIndex = indexData[selectedIndexId];
    const stocksList = selectedIndex.data.map(item => ({
      symbol: item.Symbol,
      name: item['Company Name'],
      industry: item.Industry,
    }));
    setStocks(stocksList);
    setCurrentStockIndex(0);
  }, [selectedIndexId, indexData]);

  // Fetch stock data from API
  const fetchStockData = useCallback(async () => {
    if (!stocks.length) return;

    setLoading(true);
    setError(null);

    try {
      const currentStock = stocks[currentStockIndex];
      const symbol = currentStock.symbol;

      const response = await axios.get('/api/stockData', {
        params: {
          symbol,
          range: TIME_PERIODS.find(p => p.label === selectedPeriod)?.range || '1mo',
          interval: selectedInterval,
        },
      });

      const data = response.data;

      setChartData(data);
      setCurrentStock({
        name: currentStock.name,
        symbol: currentStock.symbol,
        industry: currentStock.industry,
        price: data[data.length - 1]?.close,
        change: ((data[data.length - 1]?.close - data[0]?.open) / data[0]?.open) * 100,
        todayChange: ((data[data.length - 1]?.close - data[data.length - 2]?.close) / data[data.length - 2]?.close) * 100,
      });
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }, [stocks, currentStockIndex, selectedPeriod, selectedInterval]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Initialize and render chart
  useEffect(() => {
    if (!chartContainerRef.current || !chartData.length) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth < 768 ? 550 : 700,
      layout: { background: { type: 'solid', color: '#1e293b' }, textColor: '#e2e8f0' },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candlestickSeries = chart.addCandlestickSeries();
    candlestickSeries.setData(chartData);

    chart.timeScale().fitContent();
    chartInstanceRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: window.innerWidth < 768 ? 550 : 700,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData]);

  const handleIntervalChange = (newInterval) => {
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

  return (
    <div className="flex flex-col min-h-screen bg-[#1e293b]">
      <header className="bg-[#1e293b] border-b border-[#334155] px-2 sm:px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <select
            className="bg-[#1e293b] text-[#e2e8f0]"
            value={selectedIndexId}
            onChange={(e) => setSelectedIndexId(parseInt(e.target.value))}
          >
            {indexData.map((item, index) => (
              <option key={index} value={index}>{item.label}</option>
            ))}
          </select>

          <div className="relative" ref={searchRef}>
            <div className="flex items-center bg-slate-800 rounded-lg">
              <Search className="h-4 w-4 text-slate-400 ml-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search stocks..."
                className="w-40 sm:w-64 px-2 py-1.5 text-sm bg-transparent text-white"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="p-1.5 text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isSearching && filteredStocks.length > 0 && (
              <div className="absolute w-full bg-slate-800 z-50">
                <ul>
                  {filteredStocks.map((stock, index) => (
                    <li key={stock.symbol}>
                      <button onClick={() => handleSelectStock(index)}>{stock.symbol}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {loading ? <p>Loading...</p> : <div ref={chartContainerRef} />}
      </main>

      <footer className="bg-[#1e293b] fixed bottom-0 w-full">
        <div className="flex justify-between max-w-6xl mx-auto px-2 sm:px-4 py-1">
          <button onClick={handlePrevious} disabled={currentStockIndex === 0}>Previous</button>
          <button onClick={handleNext} disabled={currentStockIndex === stocks.length - 1}>Next</button>
        </div>
      </footer>
    </div>
  );
};

export default StockChart;
