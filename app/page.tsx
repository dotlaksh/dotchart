'use client';

import { useState, useRef } from 'react';
import { StockCarousel } from '@/components/StockChart';

export default function Home() {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [stockRange, setStockRange] = useState<string>('6mo');     // Default to '6mo' for 6M
  const [stockInterval, setStockInterval] = useState<string>('1d'); // Default to '1d'
  const pageRef = useRef<HTMLDivElement>(null);

  const handleCategoryChange = (index: number) => {
    setCurrentCategoryIndex(index);
  };

  return (
    <main className="flex flex-col h-screen" ref={pageRef}>
      <div className="flex-grow overflow-hidden">
        <StockCarousel
          onCategoryChange={handleCategoryChange}
          currentCategoryIndex={currentCategoryIndex}
          stockRange={stockRange}
          stockInterval={stockInterval}
          setStockRange={setStockRange}
          setStockInterval={setStockInterval}
        />
      </div>
    </main>
  );
}
