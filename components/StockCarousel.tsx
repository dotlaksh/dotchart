'use client'

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import StockChart from '@/components/StockChart'
import { stockCategories } from '@/lib/stockList'

const StockCarousel: React.FC = () => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [currentStockIndex, setCurrentStockIndex] = useState(0)
  const [interval, setInterval] = useState<string>('1d')
  const [range, setRange] = useState<string>('1y')

  const currentCategory = stockCategories[currentCategoryIndex]
  const currentStock = {
    ...currentCategory.data[currentStockIndex],
    PercentChange: Math.random() * 10 - 5 // This is a placeholder. Replace with actual data when available.
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
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={currentCategoryIndex.toString()}
              onValueChange={(value) => handleCategoryChange(parseInt(value))}
            >
              <SelectTrigger className="w-[125px]">
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
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1y">Daily</SelectItem>
                <SelectItem value="5y">Weekly</SelectItem>
                <SelectItem value="max">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="w-full">
          <StockChart symbol={currentStock.Symbol} interval={interval} range={range} />
        </div>
      </div>
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

