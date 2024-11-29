'use client'

import { useState } from 'react'
import { StockCarousel } from '@/components/StockChart'
import { ThemeToggle } from '@/components/theme-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { stockCategories } from '@/lib/stockList'

export default function Home() {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [range, setRange] = useState<string>('1y')

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index)
  }

  const handleRangeChange = (value: string) => {
    setRange(value)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-6">
      <div className="z-10 w-full max-w-6xl items-center justify-between font-mono text-sm">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-lg font-bold">dotChart</h1>
          <div className="flex items-center gap-4">
            <Select
              value={currentCategoryIndex.toString()}
              onValueChange={(value) => handleCategoryChange(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
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
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1y">Daily</SelectItem>
                <SelectItem value="5y">Weekly</SelectItem>
                <SelectItem value="max">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
        </div>
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

