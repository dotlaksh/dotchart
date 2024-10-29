"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import axios from 'axios';
import nifty50Data from '/public/nifty50.json';
import niftyNext50Data from '/public/niftynext50.json';
import midcap150Data from '/public/midcap150.json';
import smallcap250Data from '/public/smallcap250.json';
import microCap250Data from '/public/microcap250.json';

const TIME_PERIODS = [
  { label: 'YTD', days: 365 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '5Y', days: 1825 },
  { label: 'Max', days: 3650 },
];

const INTERVALS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
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
  const [stocks, setStocks] = useState([]);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('YTD');
  const [selectedInterval, setSelectedInterval] = useState('daily');
  const [currentStock, setCurrentStock] = useState(null);

  const chartContainerRef = useRef(null);

  const getChartHeight = useCallback(() => (window.innerWidth < 768 ? 300 : 500), []);

  useEffect(() => {
    const selectedIndex = indexData[selectedIndexId];
    const stocksList = selectedIndex.data.map(item => ({
      symbol: item.Symbol,
      name: item["Company Name"],
      industry: item.Industry,
    }));
    setStocks(stocksList);
    setCurrentStockIndex(0);
  }, [selectedIndexId, indexData]);

  const fetchStockData = useCallback(async () => {
    if (!stocks.length) return;
    setLoading(true);
    try {
      const currentStock = stocks[currentStockIndex];
      const response = await axios.get('/api/stockData', {
        params: {
          symbol: currentStock.symbol,
        },
      });

      const formattedData = response.data.map(item => ({
        time: new Date(item.time).getTime() / 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }));
      setChartData(formattedData);
      setCurrentStock(currentStock);
    } finally {
      setLoading(false);
    }
  }, [stocks, currentStockIndex]);

  useEffect(() => fetchStockData(), [fetchStockData]);

  useEffect(() => {
    if (!chartContainerRef.current || !chartData.length) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(),
      layout: { background: { color: '#fff' }, textColor: '#000' },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const series = chart.addCandlestickSeries();
    series.setData(chartData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: getChartHeight() });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, getChartHeight]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white py-3 px-4 shadow-md">
        <h1 className="text-xl font-bold text-center">dotCharts</h1>
        <select
          className="w-full mt-2 p-2 rounded-md border border-gray-300"
          value={selectedIndexId}
          onChange={(e) => setSelectedIndexId(parseInt(e.target.value))}
        >
          {indexData.map((item, index) => (
            <option key={index} value={index}>
              {item.label}
            </option>
          ))}
        </select>
      </header>

      {currentStock && (
        <div className="p-4 bg-white shadow-sm rounded-md my-2 text-center">
          <p className="text-lg font-semibold">{currentStock.name}</p>
          <p className="text-sm text-gray-500">{currentStock.symbol}</p>
          <p className="text-xl font-bold mt-1">{chartData[chartData.length - 1]?.close.toFixed(2)}</p>
        </div>
      )}

      <main className="flex-grow p-2">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-72 rounded-md bg-white shadow-lg"></div>
        )}
      </main>

      <footer className="bg-white py-2 px-4 shadow-t border-t mt-2 flex items-center justify-between">
        <button
          onClick={() => setCurrentStockIndex((i) => Math.max(i - 1, 0))}
          className="text-sm text-blue-500"
        >
          Previous
        </button>
        <span className="text-sm">{currentStockIndex + 1} / {stocks.length}</span>
        <button
          onClick={() => setCurrentStockIndex((i) => Math.min(i + 1, stocks.length - 1))}
          className="text-sm text-blue-500"
        >
          Next
        </button>
      </footer>
    </div>
  );
};

export default StockChart;
