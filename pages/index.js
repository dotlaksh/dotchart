'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { AgChartsReact } from 'ag-charts-react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

import nifty50Data from '/public/nifty50.json'
import niftyNext50Data from '/public/niftynext50.json'
import midcap150Data from '/public/midcap150.json'
import smallcap250Data from '/public/smallcap250.json'
import microCap250Data from '/public/microcap250.json'

const TIME_PERIODS = [
  { label: '1Y', range: '1y', autoInterval: 'daily' },
  { label: '5Y', range: '5y', autoInterval: 'weekly' },
  { label: 'Max', range: 'max', autoInterval: 'monthly' },
]

const INTERVALS = [
  { label: 'D', value: 'daily', interval: '1d', autoTimeframe: '1Y' },
  { label: 'W', value: 'weekly', interval: '1wk', autoTimeframe: '5Y' },
  { label: 'M', value: 'monthly', interval: '1mo', autoTimeframe: 'Max' },
]

export default function StockChart() {
  const [indexData] = useState([
    { label: 'Nifty 50', data: nifty50Data },
    { label: 'Nifty Next 50', data: niftyNext50Data },
    { label: 'Midcap 150', data: midcap150Data },
    { label: 'Smallcap 250', data: smallcap250Data },
    { label: 'MicroCap 250', data: microCap250Data },
  ])
  const [selectedIndexId, setSelectedIndexId] = useState(0)
  const [currentStockIndex, setCurrentStockIndex] = useState(0)
  const [stocks, setStocks] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('1Y')
  const [selectedInterval, setSelectedInterval] = useState('daily')
  const [currentStock, setCurrentStock] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [filteredStocks, setFilteredStocks] = useState([])
  const searchRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearching(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (value) => {
    setSearchTerm(value)
    if (value.trim() === '') {
      setFilteredStocks([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const searchResults = stocks.filter(stock => 
      stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
      stock.name.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5)
    setFilteredStocks(searchResults)
  }

  const handleSelectStock = (stockIndex) => {
    setCurrentStockIndex(stockIndex)
    setSearchTerm('')
    setIsSearching(false)
    setFilteredStocks([])
  }

  useEffect(() => {
    const selectedIndex = indexData[selectedIndexId]
    const stocksList = selectedIndex.data.map(item => ({
      symbol: item.Symbol,
      name: item["Company Name"],
      industry: item.Industry
    }))
    setStocks(stocksList)
    setCurrentStockIndex(0)
  }, [selectedIndexId, indexData])

  const fetchStockData = useCallback(async () => {
    if (!stocks.length) return
    
    setLoading(true)
    setError(null)
    
    try {
      const currentStock = stocks[currentStockIndex]
      const period = TIME_PERIODS.find(p => p.label === selectedPeriod)
      const interval = INTERVALS.find(i => i.value === selectedInterval)

      const response = await axios.get('/api/stockData', {
        params: {
          symbol: currentStock.symbol,
          range: period.range,
          interval: interval.interval
        }
      })

      if (response.data && Array.isArray(response.data)) {
        setChartData(response.data.map(item => ({
          date: new Date(item.date),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        })))
        setCurrentStock({
          name: currentStock.name,
          symbol: currentStock.symbol,
          industry: currentStock.industry,
          price: response.data[response.data.length - 1]?.close,
          change: ((response.data[response.data.length - 1]?.close - response.data[0]?.open) / response.data[0]?.open) * 100,
          todayChange: ((response.data[response.data.length - 1]?.close - response.data[response.data.length - 2]?.close) / response.data[response.data.length - 2]?.close) * 100
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock data')
    } finally {
      setLoading(false)
    }
  }, [stocks, currentStockIndex, selectedPeriod, selectedInterval])

  useEffect(() => {
    fetchStockData()
  }, [fetchStockData])

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod)
    const autoInterval = TIME_PERIODS.find((p) => p.label === newPeriod)?.autoInterval
    if (autoInterval) {
      setSelectedInterval(autoInterval)
    }
  }

  const handleIntervalChange = (newInterval) => {
    const autoTimeframe = INTERVALS.find((i) => i.value === newInterval)?.autoTimeframe
    setSelectedInterval(newInterval)
    if (autoTimeframe) {
      setSelectedPeriod(autoTimeframe)
    }
  }

  const handlePrevious = () => {
    if (currentStockIndex > 0) {
      setCurrentStockIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentStockIndex < stocks.length - 1) {
      setCurrentStockIndex(prev => prev + 1)
    }
  }

  const chartOptions = {
    autoSize: true,
    title: {
      text: currentStock?.symbol,
      fontSize: 18,
    },
    series: [
      {
        type: 'candlestick',
        xKey: 'date',
        openKey: 'open',
        highKey: 'high',
        lowKey: 'low',
        closeKey: 'close',
        tooltip: {
          enabled: true,
        },
      },
      {
        type: 'column',
        xKey: 'date',
        yKey: 'volume',
        yName: 'Volume',
        fill: 'rgba(100, 100, 100, 0.5)',
      },
    ],
    axes: [
      {
        type: 'time',
        position: 'bottom',
      },
      {
        type: 'number',
        position: 'left',
        label: {
          format: '₹,.2f',
        },
      },
      {
        type: 'number',
        position: 'right',
        keys: ['volume'],
        label: {
          format: ',.0f',
        },
      },
    ],
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <select
            className="bg-white border border-gray-300 rounded-md text-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedIndexId}
            onChange={(e) => setSelectedIndexId(parseInt(e.target.value))}
          >
            {indexData.map((item, index) => (
              <option key={index} value={index}>{item.label}</option>
            ))}
          </select>

          <div className="relative" ref={searchRef}>
            <div className="flex items-center">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search stocks..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilteredStocks([])
                    setIsSearching(false)
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>

            {isSearching && filteredStocks.length > 0 && (
              <div className="absolute right-0 mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
                {filteredStocks.map((stock) => {
                  const stockIndex = stocks.findIndex(s => s.symbol === stock.symbol)
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => handleSelectStock(stockIndex)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none"
                    >
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-sm text-gray-500 truncate">{stock.name}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {isSearching && searchTerm && filteredStocks.length === 0 && (
              <div className="absolute right-0 mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
                <p className="px-4 py-2 text-sm text-gray-500">No stocks found</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {currentStock && (
        <div className="bg-white shadow-sm mt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentStock.symbol}</h2>
                <p className="text-sm text-gray-500">{currentStock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">₹{currentStock.price?.toFixed(2)}</p>
                <p className={`text-sm ${currentStock.todayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentStock.todayChange >= 0 ? '+' : ''}{currentStock.todayChange?.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {TIME_PERIODS.map((period) => (
                <button
                  key={period.label}
                  onClick={() => handlePeriodChange(period.label)}
                  className={`px-4 py-2 rounded-md ${
                    selectedPeriod === period.label
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              {INTERVALS.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => handleIntervalChange(interval.value)}
                  className={`px-4 py-2 rounded-md ${
                    selectedInterval === interval.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow bg-white mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="h-[600px] flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : error ? (
              <div className="h-[600px] flex items-center justify-center">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              <div className="h-[600px]">
                <AgChartsReact options={chartOptions} data={chartData} />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-lg mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStockIndex === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5 inline-block mr-1" />
              Previous
            </button>
            
            <div className="px-4 py-2 bg-gray-200 rounded-md">
              <span className="font-medium">{currentStockIndex + 1}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span className="text-gray-500">{stocks.length}</span>
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentStockIndex === stocks.length - 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-5 w-5 inline-block ml-1" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
