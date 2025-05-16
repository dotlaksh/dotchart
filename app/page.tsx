'use client';

import { useState, useEffect, useRef } from 'react';
import { StockCarousel } from '@/components/StockChart';

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
