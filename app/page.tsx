'use client'

import { useState, useEffect, useRef } from 'react'
import { StockCarousel } from '@/components/StockChart'
import { ThemeToggle } from '@/components/theme-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { stockCategories } from '@/lib/stockList'
import { Maximize, Minimize } from 'lucide-react'

export default function Home() {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [range, setRange] = useState<string>('1y')
  const [windowHeight, setWindowHeight] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      pageRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', fullscreenChangeHandler);

    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
    };
  }, []);

  return (
    <main className="flex flex-col h-screen" ref={pageRef}>
      <div className="flex justify-between items-center p-2 bg-background relative z-50">
        <h1 className="text-lg font-bold">dotChart</h1>
        <div className="flex items-center gap-2">
          <Select
            value={currentCategoryIndex.toString()}
            onValueChange={(value) => handleCategoryChange(parseInt(value))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
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
            <SelectContent className="z-[100]">
              <SelectItem value="1y">1Y</SelectItem>
              <SelectItem value="5y">5Y</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
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

