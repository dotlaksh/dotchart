"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar, BarChart2 } from 'lucide-react';
import nifty50Data from '/public/nifty50.json';
import niftyNext50Data from '/public/niftynext50.json';
import midcap150Data from '/public/midcap150.json';
import smallcap250Data from '/public/smallcap250.json';
import microCap250Data from '/public/microcap250.json';

const TIME_PERIODS = [
  { label: '1Y', days: 365 ,auto:'1y'},
  { label: '2Y', days: 730 },
  { label: '5Y', days: 1825 },
  { label: 'Max', days: 3650 },
];

const INTERVALS = [
  { label: 'D', value: 'daily', autoTimeframe: '1Y' },
  { label: 'W', value: 'weekly', autoTimeframe: '2Y' },
  { label: 'M', value: 'monthly', autoTimeframe: '5Y' },
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
  const [selectedPeriod, setSelectedPeriod] = useState('YTD');
  const [selectedInterval, setSelectedInterval] = useState('daily');
  const [currentStock, setCurrentStock] = useState(null);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const legendRef = useRef(null);


  // Mobile-first chart height
  const getChartHeight = useCallback(() => {
    return window.innerWidth < 768 ? 550 : 700;
  }, []);

  // Initialize stocks when index is selected
  useEffect(() => {
    const selectedIndex = indexData[selectedIndexId];
    const stocksList = selectedIndex.data.map(item => ({
      symbol: item.Symbol,
      name: item["Company Name"],
      industry: item.Industry
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
      const endDate = new Date();
      const startDate = new Date();
      const period = TIME_PERIODS.find(p => p.label === selectedPeriod);
      startDate.setDate(endDate.getDate() - (period?.days || 365));

      const response = await axios.get('/api/stockData', {
        params: {
          symbol: currentStock.symbol,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });

      const formattedData = response.data.map(item => ({
        time: new Date(item.time).getTime() / 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));

      const adjustedData = aggregateData(formattedData, selectedInterval);
      
      setChartData(adjustedData);
      setCurrentStock({
        name: currentStock.name,
        symbol: currentStock.symbol,
        industry: currentStock.industry,
        price: adjustedData[adjustedData.length - 1]?.close,
        change: ((adjustedData[adjustedData.length - 1]?.close - adjustedData[0]?.open) / adjustedData[0]?.open) * 100,
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

  const aggregateData = (data, interval) => {
    if (interval === 'daily') return data;

    const aggregatedData = [];
    const periodMap = {};

    data.forEach((item) => {
      const date = new Date(item.time * 1000);
      let periodKey;

      if (interval === 'weekly') {
        const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
        periodKey = startOfWeek.toISOString().slice(0, 10);
      } else if (interval === 'monthly') {
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      if (!periodMap[periodKey]) {
        periodMap[periodKey] = {
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        };
      } else {
        periodMap[periodKey].high = Math.max(periodMap[periodKey].high, item.high);
        periodMap[periodKey].low = Math.min(periodMap[periodKey].low, item.low);
        periodMap[periodKey].close = item.close;
        periodMap[periodKey].volume += item.volume;
      }
    });

    return Object.values(periodMap).sort((a, b) => a.time - b.time);
  };

  useEffect(() => {
  if (!chartContainerRef.current || !chartData.length) return;

  const chart = createChart(chartContainerRef.current, {
    width: chartContainerRef.current.clientWidth,
    height: getChartHeight(),
    layout: { background: { type: 'solid', color: '#ffffff' }, textColor: '#000000' },
    crosshair: { mode: CrosshairMode.Normal },
    timeScale: {
      timeVisible: true,
      borderColor: '#cbd5e1',
      rightOffset: 5,
      minBarSpacing: 5,
    },
  });

  // Candlestick series on the main pane with its own price scale
  const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    priceScaleId: 'right', // Right-side price scale for candlestick chart
  });

  candlestickSeries.setData(chartData);

  // Volume series in a new pane with a separate price scale
  const volumeSeries = chart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' }, // Volume format
    priceScaleId: 'volume', // Separate price scale for volume
    scaleMargins: { top: 0, bottom: 0.8 }, // Adjust size of the volume pane
  });

  volumeSeries.setData(chartData.map(d => ({
    time: d.time,
    value: d.volume,
    color: d.close >= d.open ? '#26a69a80' : '#ef535080',
  })));
// Setup legend
    const legend = document.createElement('div');
    legend.style = `
      position: absolute;
      left: 12px;
      top: 12px;
      z-index: 1;
      font-size: 14px;
      font-family: sans-serif;
      line-height: 18px;
      font-weight: 300;
    `;
    chartContainerRef.current.appendChild(legend);
    legendRef.current = legend;

    const updateLegend = (param) => {
      if (!param.time) {
        legend.innerHTML = 'Hover over the chart';
        return;
      }

      const data = param.seriesData.get(candlestickSeries);
      if (data) {
        legend.innerHTML = `<strong>Close:</strong> ${data.close.toFixed(2)}`;
      }
    };

    chart.subscribeCrosshairMove(updateLegend);
  chart.timeScale().fitContent(); // Ensure the chart fits the data
  chartInstanceRef.current = chart;

  const handleResize = () => {
    chart.applyOptions({
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(),
    });
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
    chart.remove();
  };
}, [chartData, getChartHeight]);



  const handleIntervalChange = (newInterval) => {
    const autoTimeframe = INTERVALS.find((i) => i.value === newInterval)?.autoTimeframe;
    setSelectedInterval(newInterval);
    if (autoTimeframe) {
      setSelectedPeriod(autoTimeframe);
    }
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
    <div className="flex-grow flex items-center justify-center p-1">
      <div ref={chartContainerRef} className="w-full h-full relative" />
    </div>
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Simplified Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <select
            className="text-sm font-medium bg-transparent focus:outline-none"
            value={selectedIndexId}
            onChange={(e) => setSelectedIndexId(parseInt(e.target.value))}
          >
            {indexData.map((item, index) => (
              <option key={index} value={index}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Stock Info Card */}
      {currentStock && (
        <div className="px-4 py-3 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base">{currentStock.symbol}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{currentStock.name}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-base">
                ₹{currentStock.price?.toFixed(2)}
              </p>
              <p className={`text-sm ${currentStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentStock.change >= 0 ? '+' : ''}{currentStock.change?.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Time Controls */}
      <div className="px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.label}
                onClick={() => setSelectedPeriod(period.label)}
                className={`px-3 py-1 text-xs rounded-full ${
                  selectedPeriod === period.label
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {INTERVALS.map((interval) => (
              <button
                key={interval.value}
                onClick={() => handleIntervalChange(interval.value)}
                className={`px-3 py-1 text-xs rounded-full ${
                  selectedInterval === interval.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <main className="flex-grow flex items-center justify-center p-1">
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full rounded-lg bg-white shadow-sm" />
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="bg-white border-t border-gray-200 px-1 py-1">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStockIndex === 0}
            className="flex items-center gap-1 text-sm text-blue-600 disabled:text-gray-300"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            {currentStockIndex + 1} of {stocks.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentStockIndex === stocks.length - 1}
            className="flex items-center gap-1 text-sm text-blue-600 disabled:text-gray-300"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default StockChart;
