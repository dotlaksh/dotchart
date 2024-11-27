'use client'

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StockChart from '@/components/StockChart'
import { stockCategories } from '@/lib/stockList'

const StockCarousel: React.FC = () => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [currentStockIndex, setCurrentStockIndex] = useState(0)
  const [interval, setInterval] = useState<string>('1d')
  const [range, setRange] = useState<string>('1y')

  const currentCategory = stockCategories[currentCategoryIndex]
  const currentStock = currentCategory.data[currentStockIndex]
  const totalStocks = currentCategory.data.length

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

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-grow overflow-y-auto">
        <div className="mb-2 flex flex-nowrap justify-between items-center gap-1 overflow-x-auto">
          <Select
            value={currentCategoryIndex.toString()}
            onValueChange={(value) => handleCategoryChange(parseInt(value))}
          >
            <SelectTrigger className="w-[150px] min-w-[150px]">
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
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-[100px] min-w-[100px]">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Daily</SelectItem>
              <SelectItem value="1wk">Weekly</SelectItem>
              <SelectItem value="1mo">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[100px] min-w-[100px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6mo">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="5y">5 Years</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="w-full">
          <CardContent className="p-2">
            <StockChart symbol={currentStock.Symbol} interval={interval} range={range} />
          </CardContent>
        </Card>
      </div>
      <div className="sticky bottom-0 mt-4 p-4 bg-background border-t flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Stock {currentStockIndex + 1} of {totalStocks}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handlePrevious}
            disabled={currentStockIndex === 0}
            aria-label="Previous stock"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleNext}
            disabled={currentStockIndex === totalStocks - 1}
            aria-label="Next stock"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StockCarousel

