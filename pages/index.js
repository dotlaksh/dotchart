'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { AgChartsReact } from 'ag-charts-react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Select value={selectedIndexId.toString()} onValueChange={(value) => setSelectedIndexId(parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select an index" />
            </SelectTrigger>
            <SelectContent>
              {indexData.map((item, index) => (
                <SelectItem key={index} value={index.toString()}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative" ref={searchRef}>
            <div className="flex items-center">
              <Search className="h-4 w-4 text-muted-foreground absolute left-2" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search stocks..."
                className="w-64 pl-8"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchTerm('')
                    setFilteredStocks([])
                    setIsSearching(false)
                  }}
                  className="absolute right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isSearching && filteredStocks.length > 0 && (
              <Card className="absolute right-0 mt-2 w-full">
                <CardContent className="p-0">
                  {filteredStocks.map((stock) => {
                    const stockIndex = stocks.findIndex(s => s.symbol === stock.symbol)
                    return (
                      <Button
                        key={stock.symbol}
                        variant="ghost"
                        onClick={() => handleSelectStock(stockIndex)}
                        className="w-full justify-start"
                      >
                        <div>
                          <p className="font-medium">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
                        </div>
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {isSearching && searchTerm && filteredStocks.length === 0 && (
              <Card className="absolute right-0 mt-2 w-full">
                <CardContent>
                  <p className="text-sm text-muted-foreground">No stocks found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </header>

      {currentStock && (
        <div className="bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight">
                  {currentStock.symbol}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{currentStock.name}</p>
              </div>
              <div className="mt-4 flex md:ml-4 md:mt-0">
                <p className="font-medium text-2xl">
                  ₹{currentStock.price?.toFixed(2)}
                </p>
                <p className={`ml-2 text-sm ${currentStock.todayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentStock.todayChange >= 0 ? '+' : ''}{currentStock.todayChange?.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {TIME_PERIODS.map((period) => (
                <Button
                  key={period.label}
                  variant={selectedPeriod === period.label ? 'default' : 'outline'}
                  onClick={() => handlePeriodChange(period.label)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {INTERVALS.map((interval) => (
                <Button
                  key={interval.value}
                  variant={selectedInterval === interval.value ? 'default' : 'outline'}
                  onClick={() => handleIntervalChange(interval.value)}
                >
                  {interval.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="h-[600px] flex items-center justify-center">
                  <p>Loading...</p>
                </div>
              ) : error ? (
                <div className="h-[600px] flex items-center justify-center text-red-500">
                  {error}
                </div>
              ) : (
                <div className="h-[600px]">
                  <AgChartsReact options={chartOptions} data={chartData} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-background fixed bottom-0 left-0 right-0 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  onClick={handlePrevious}
                  disabled={currentStockIndex === 0}
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                <div className="flex items-center px-4 py-2 bg-muted rounded-md">
                  <span className="text-sm font-medium">{currentStockIndex + 1}</span>
                  <span className="mx-1 text-muted-foreground">/</span>
                  <span className="text-sm font-medium text-muted-foreground">{stocks.length}</span>
                </div>
                
                <Button
                  onClick={handleNext}
                  disabled={currentStockIndex === stocks.length - 1}
                  variant="outline"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </footer>
    </div>
  )
}
