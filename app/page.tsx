'use client'

import { useState, useEffect } from 'react'
import { StockCarousel } from '@/components/StockChart'
import { ThemeToggle } from '@/components/theme-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { stockCategories } from '@/lib/stockList'

export default function Home() {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [range, setRange] = useState<string>('1y')
  const [windowHeight, setWindowHeight] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index)
  }

  const handleRangeChange = (value: string) => {
    setRange(value)
  }

  return (
    <main className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 bg-background">
        <h1 className="text-2xl font-bold">dotChart</h1>
        <div className="flex items-center gap-2">
          <Select
            value={currentCategoryIndex.toString()}
            onValueChange={(value) => handleCategoryChange(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Category" />
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
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1y">1Y</SelectItem>
              <SelectItem value="5y">5Y</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
        </div>
      </div>
      <div className="flex-grow overflow-hidden" style={{ height: `calc(${windowHeight}px - 8rem)` }}>
        <StockCarousel 
          onCategoryChange={handleCategoryChange}
          onRangeChange={handleRangeChange}
          currentCategoryIndex={currentCategoryIndex}
          range={range}
        />
      </div>
    </main>
  )
}

