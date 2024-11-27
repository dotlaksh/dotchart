'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import StockChart from '@/components/StockChart'
import { stockCategories, StockCategory, Stock } from '@/lib/stockList'

const StockCarousel: React.FC = () => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [currentStockIndex, setCurrentStockIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [interval, setInterval] = useState<string>('1d')
  const [range, setRange] = useState<string>('1y')

  const currentCategory = stockCategories[currentCategoryIndex]
  const currentStock = currentCategory.data[currentStockIndex]

  const nextStock = () => {
    setDirection(1)
    setCurrentStockIndex((prevIndex) => (prevIndex + 1) % currentCategory.data.length)
  }

  const prevStock = () => {
    setDirection(-1)
    setCurrentStockIndex((prevIndex) => (prevIndex - 1 + currentCategory.data.length) % currentCategory.data.length)
  }

  const handleSwipe = (event: any, info: any) => {
    if (info.offset.x < -50) {
      nextStock()
    } else if (info.offset.x > 50) {
      prevStock()
    }
  }

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index)
    setCurrentStockIndex(0)
  }

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      }
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      }
    }
  }

  return (
    <div className="relative w-full">
      <div className="mb-4 flex flex-nowrap justify-between items-center gap-2 overflow-x-auto">
        <Select
          value={currentCategoryIndex.toString()}
          onValueChange={(value) => handleCategoryChange(parseInt(value))}
        >
          <SelectTrigger className="w-[160px] min-w-[160px]">
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
            <SelectItem value="1y">1 Year</SelectItem>
            <SelectItem value="5y">5 Years</SelectItem>
            <SelectItem value="max">Max</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`${currentCategoryIndex}-${currentStockIndex}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={handleSwipe}
        >
          <Card className="w-full">
            <CardContent className="p-6">
              <StockChart symbol={currentStock.Symbol} interval={interval} range={range} />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Stock {currentStockIndex + 1} of {currentCategory.data.length}
        </div>
      </div>
    </div>
  )
}

export default StockCarousel
