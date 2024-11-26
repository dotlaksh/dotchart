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
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">{currentCategory.name}</h2>
        <Select
          value={currentCategoryIndex.toString()}
          onValueChange={(value) => handleCategoryChange(parseInt(value))}
        >
          <SelectTrigger className="w-[200px]">
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
              <h2 className="text-2xl font-bold mb-4">{currentStock["Company Name"]} ({currentStock.Symbol})</h2>
              <StockChart symbol={currentStock.Symbol} />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
           
    </div>
  )
}

export default StockCarousel


