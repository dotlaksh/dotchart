'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Activity, Search } from 'lucide-react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { stockCategories } from '@/lib/stockList'
import { motion, AnimatePresence } from "framer-motion"
import clsx from "clsx"

const intervals = [
  { label: '3M', value: '1d', range: '3mo' },
  { label: '6M', value: '1d', range: '6mo' },
  { label: '1Y', value: '1d', range: '1y' },
  { label: '2Y', value: '1wk', range: '2y' },
  { label: '5Y', value: '1wk', range: '5y' },
  { label: '10Y', value: '1mo', range: '10y' },
  { label: 'All', value: '1mo', range: 'max' }
];

interface ChartData { time: string; open: number; high: number; low: number; close: number; volume: number; }

interface StockChartProps {
  symbol: string; interval: string; range: string; onIntervalClick: (item: any) => void;
  currentCategoryIndex: number; currentStockIndex: number; totalStocks: number;
  onPrev: () => void; onNext: () => void;
}

const StockChart: React.FC<StockChartProps> = ({
  symbol, interval, range, onIntervalClick,
  currentStockIndex, totalStocks, onPrev, onNext
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const barSeriesRef = useRef<ISeriesApi<"Bar"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [todayPrice, setTodayPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)
  const [stats, setStats] = useState<any>({})

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`);
        const jsonData = await res.json()
        setData(jsonData)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    fetchData()
  }, [symbol, interval, range])

  useEffect(() => {
    if (chartContainerRef.current && data.length > 0) {
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'rgba(255, 255, 255, 0.4)', fontSize: 10 },
        grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255, 255, 255, 0.02)' } },
        timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', visible: true, rightOffset: 5 },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)', visible: true },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        handleScroll: true, handleScale: true,
      })
      chartRef.current = chart

      const series = chart.addBarSeries({ upColor: '#10b981', downColor: '#f43f5e', thinBars: true })
      series.setData(data)
      barSeriesRef.current = series

      const vSeries = chart.addHistogramSeries({ color: 'rgba(255, 255, 255, 0.05)', priceFormat: { type: 'volume' }, priceScaleId: 'volume' })
      vSeries.setData(data.map((d, i) => ({
        time: d.time, value: d.volume,
        color: i > 0 ? (d.close >= data[i - 1].close ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)') : 'rgba(16, 185, 129, 0.6)'
      })))
      volumeSeriesRef.current = vSeries

      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.15, bottom: 0.1 } })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
      chart.timeScale().fitContent()

      const latest = data[data.length - 1]
      const prev = data[data.length - 2]?.close
      setTodayPrice(latest.close)
      if (prev) setPriceChange(((latest.close - prev) / prev) * 100)
      setStats({
        open: latest.open, prev: prev || latest.close,
        high: Math.max(...data.map(d => d.high)), low: Math.min(...data.map(d => d.low)),
        vol: data.reduce((s, d) => s + d.volume, 0)
      })

      const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth, height: chartContainerRef.current?.clientHeight })
      window.addEventListener('resize', handleResize)
      return () => { window.removeEventListener('resize', handleResize); chart.remove(); }
    }
  }, [data])

  const StatCard = ({ label, value, color = "text-white" }: any) => (
    <div className="flex flex-col p-1 bg-white/5 rounded-lg border border-white/5">
      <span className="text-[7px] uppercase text-white/20 font-black mb-0.5">{label}</span>
      <span className={clsx("text-[9px] font-black tabular-nums leading-none", color)}>{(value !== undefined && value !== null) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-1 h-full max-w-2xl mx-auto min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 glass rounded-xl relative overflow-hidden">
        <div className="absolute top-1 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-3xl px-2 py-1 rounded-md border border-white/10 pointer-events-auto">
            <span className="text-[10px] font-black text-white uppercase">{symbol}</span>
            <div className="w-[1px] h-2 bg-white/20" />
            <span className="text-[10px] font-black text-white tabular-nums">
              ₹{todayPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '--'}
            </span>
            <span className={clsx("text-[8px] font-black tabular-nums", priceChange && priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {priceChange !== null && priceChange !== undefined ? (priceChange >= 0 ? '+' : '') + priceChange.toFixed(2) + '%' : '--'}
            </span>
          </div>

          <div className="flex bg-black/80 backdrop-blur-3xl p-0.5 rounded-md border border-white/10 pointer-events-auto gap-0.5">
            {intervals.map(i => (
              <button key={i.label} onClick={() => onIntervalClick(i)} className={clsx("px-1.5 py-0.5 rounded-sm text-[8px] font-black transition-all", i.range === range ? "bg-white text-black" : "text-white/40")}>
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* Added px-4 horizontal padding as requested */}
        <div ref={chartContainerRef} className="w-full h-full px-4"></div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0 px-1 pb-1">
        <div className="grid grid-cols-5 gap-1 flex-1 w-full sm:w-auto">
          <StatCard label="Open" value={stats.open} />
          <StatCard label="Prev" value={stats.prev} />
          <StatCard label="High" value={stats.high} color="text-emerald-400" />
          <StatCard label="Low" value={stats.low} color="text-rose-400" />
          <StatCard label="Vol" value={stats.vol ? `${(stats.vol / 100000).toFixed(1)}L` : null} />
        </div>

        <div className="flex items-center gap-1 bg-indigo-600/5 p-0.5 rounded-md border border-indigo-500/10">
          <button onClick={onPrev} disabled={currentStockIndex === 0} className="p-1.5 rounded-md bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 disabled:opacity-5">
            <ChevronLeft size={14} strokeWidth={3} />
          </button>
          <span className="text-[9px] font-black text-indigo-300 tabular-nums px-1">{currentStockIndex + 1}/{totalStocks}</span>
          <button onClick={onNext} disabled={currentStockIndex === totalStocks - 1} className="p-1.5 rounded-md bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 disabled:opacity-5">
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

const StockCarousel: React.FC<any> = (props) => {
  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const currentCategory = stockCategories[props.currentCategoryIndex];
  const currentStock = currentCategory.data[currentStockIndex] as any;
  const totalStocks = currentCategory.data.length;

  return (
    <div className="h-[100dvh] w-full bg-[#010103] text-slate-200 flex flex-col font-sans relative overflow-hidden fixed inset-0">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col m-0.5 sm:m-1 rounded-xl border border-white/5 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between px-3 py-1 border-b border-white/[0.03] bg-black/60 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"><Activity className="w-3 h-3 text-white" /></div>
            <span className="text-xs font-black tracking-tighter text-white uppercase">dotChart</span>
          </div>
          <Select value={props.currentCategoryIndex.toString()} onValueChange={(v) => { props.onCategoryChange(Number(v)); setCurrentStockIndex(0); }}>
            <SelectTrigger className="w-[120px] bg-white/5 border-white/5 rounded text-[8px] font-black h-6 px-1.5">
              <SelectValue placeholder="Index" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 rounded-lg">
              {stockCategories.map((cat, idx) => (
                <SelectItem key={idx} value={idx.toString()} className="text-[8px] font-bold py-1 px-2">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        <main className="flex-1 overflow-hidden min-h-0 p-0">
          <AnimatePresence mode="wait">
            <motion.div key={`${props.currentCategoryIndex}-${currentStockIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full w-full">
              <StockChart
                symbol={currentStock.Symbol} interval={props.stockInterval} range={props.stockRange}
                onIntervalClick={(i: any) => { props.setStockRange(i.range); props.setStockInterval(i.value); }}
                currentCategoryIndex={props.currentCategoryIndex} currentStockIndex={currentStockIndex} totalStocks={totalStocks}
                onPrev={() => setCurrentStockIndex(p => Math.max(0, p - 1))} onNext={() => setCurrentStockIndex(p => Math.min(totalStocks - 1, p + 1))}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

    </div>
  );
};

export { StockChart, StockCarousel }
