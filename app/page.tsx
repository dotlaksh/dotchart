'use client';

import { useState, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { stockCategories } from '@/lib/stockList';
import { StockChart } from '@/components/StockChart';

const StockCarousel: React.FC = () => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0);
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const [range, setRange] = useState<string>('1d');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentCategory = stockCategories[currentCategoryIndex];
  const currentStock = {
    ...currentCategory.data[currentStockIndex],
    percentChange: currentCategory.data[currentStockIndex].PercentChange ?? (Math.random() * 10 - 5),
  };
  const totalStocks = currentCategory.data.length;

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index);
    setCurrentStockIndex(0);
  };

  const handlePrevious = () => {
    setCurrentStockIndex((prev) => (prev - 1 + totalStocks) % totalStocks);
  };

  const handleNext = () => {
    setCurrentStockIndex((prev) => (prev + 1) % totalStocks);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!!document.fullscreenElement);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden">
        <StockChart symbol={currentStock.Symbol} interval="1d" range={range} />
      </div>
      <div className="mt-2 p-3 bg-background border-t border-muted-foreground/20 flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Select
            value={currentCategoryIndex.toString()}
            onValueChange={(value) => handleCategoryChange(parseInt(value))}
          >
            <SelectTrigger className="w-[120px] border-muted-foreground/20">
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
          <Select value={range} onValueChange={(value) => setRange(value)}>
            <SelectTrigger className="w-[80px] border-muted-foreground/20">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">D</SelectItem>
              <SelectItem value="1wk">W</SelectItem>
              <SelectItem value="1m">M</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={currentStockIndex === 0}
            aria-label="Previous stock"
            className="border-muted-foreground/20"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-2">Previous</span>
          </Button>
          <span className="mx-2">{`${currentStockIndex + 1}/${totalStocks}`}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentStockIndex === totalStocks - 1}
            aria-label="Next stock"
            className="border-muted-foreground/20"
          >
            <span className="mr-2">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [range, setRange] = useState<string>('1y');
  const pageRef = useRef<HTMLDivElement>(null);

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index);
  };

  const handleRangeChange = (value: string) => {
    setRange(value);
  };

  return (
    <main className="flex flex-col h-screen" ref={pageRef}>
      <div className="flex-grow overflow-hidden">
        <StockCarousel
          onCategoryChange={handleCategoryChange}
          onRangeChange={handleRangeChange}
          currentCategoryIndex={currentCategoryIndex}
          range={range}
        />
      </div>
    </main>
  );
}
