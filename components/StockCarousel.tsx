'use client'

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import StockChart from '@/components/StockChart'
import { stockCategories } from '@/lib/stockList'
import { cn } from "@/lib/utils"

const StockCarousel: React.FC = () => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [currentStockIndex, setCurrentStockIndex] = useState(0)
  const [interval, setInterval] = useState<string>('1d')
  const [range, setRange] = useState<string>('1y')
  const [loading, setLoading] = useState<boolean>(false)
  const [percentChange, setPercentChange] = useState<number | null>(null);

  const currentCategory = stockCategories[currentCategoryIndex]
  const currentStock = {
    ...currentCategory.data[currentStockIndex],
    PercentChange: percentChange
  }
  const totalStocks = currentCategory.data.length

  useEffect(() => {
    // Automatically adjust interval based on range
    if (range === '1y') {
      setInterval('1d')
    } else if (range === '5y') {
      setInterval('1wk')
    } else if (range === 'max') {
      setInterval('1mo')
    }
  }, [range])

  const fetchData = async () => {
    setLoading(true)
    // Existing fetch logic...
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [currentStock.Symbol, interval, range])

  useEffect(() => {
    setPercentChange(Math.random() * 10 - 5);
  }, [currentStock.Symbol]);

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index)
    setCurrentStockIndex(0)
  }

  const handlePrevious = () => {
    setCurrentStockIndex((prev) => (prev - 1 + totalStocks) % totalStocks)
  }

  const handleNext = () => {
    setCurrentStockIndex((prev) => (prev + 1) % totalStocks)
  }

  const handleRangeChange = (value: string) => {
    setRange(value)
    // Interval will be automatically adjusted by the useEffect hook
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-grow overflow-y-auto">
        <div className="flex flex-col w-full mb-4">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col">
              <span className="font-semibold text-lg">{currentStock.Symbol}</span>
              {!loading && currentStock.PercentChange !== null && (
                <span className={`text-sm ${currentStock.PercentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentStock.PercentChange >= 0 ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />}
                  {Math.abs(currentStock.PercentChange).toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={currentCategoryIndex.toString()}
                onValueChange={(value) => handleCategoryChange(parseInt(value))}
              >
                <SelectTrigger className="w-[150px] border-input hover:bg-accent hover:text-accent-foreground">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {stockCategories.map((category, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={range} onValueChange={handleRangeChange}>
                <SelectTrigger className="w-[100px] border-input hover:bg-accent hover:text-accent-foreground">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1y">1Y - D</SelectItem>
                  <SelectItem value="5y">5Y - W</SelectItem>
                  <SelectItem value="max">Max - M</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {loading && (
            <div className="mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
        <div className="w-full">
          <StockChart symbol={currentStock.Symbol} interval={interval} range={range} />
        </div>
      </div>
      <style jsx global>{`
        .border-input[data-state="open"] {
          border-color: hsl(var(--input));
          outline: none;
          ring-offset-color: hsl(var(--background));
          ring-color: hsl(var(--ring));
        }
      `}</style>
      <div className="sticky bottom-0 mt-4 p-4 bg-background border-t border-muted-foreground/20 flex justify-between items-center">
        <div className="text-sm">
          Stock {currentStockIndex + 1} of {totalStocks}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handlePrevious}
            disabled={currentStockIndex === 0}
            aria-label="Previous stock"
            className="border-muted-foreground/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleNext}
            disabled={currentStockIndex === totalStocks - 1}
            aria-label="Next stock"
            className="border-muted-foreground/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StockCarousel

