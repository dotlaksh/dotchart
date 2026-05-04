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

      // Create a clear 10% gap between price bars and volume bars using scaleMargins
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.3 } })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      chart.timeScale().fitContent()

      const latest = data[data.length - 1]
      const prevDay = data[data.length - 2]?.close
      setTodayPrice(latest.close)
      if (prevDay) setPriceChange(((latest.close - prevDay) / prevDay) * 100)
      setStats({
        open: latest.open,
        high: Math.max(...data.map(d => d.high)),
        low: Math.min(...data.map(d => d.low)),
        close: latest.close,
        vol: data.reduce((s, d) => s + d.volume, 0)
      })

      const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth, height: chartContainerRef.current?.clientHeight })
      window.addEventListener('resize', handleResize)
      return () => { window.removeEventListener('resize', handleResize); chart.remove(); }
    }
  }, [data])

  const StatCard = ({ label, value, color = "text-white" }: any) => (
    <div className="flex flex-col p-2 bg-white/5 rounded-xl border border-white/5 shadow-inner">
      <span className="text-[8px] uppercase text-white/30 font-black mb-1">{label}</span>
      <span className={clsx("text-sm font-black tabular-nums leading-none tracking-tighter", color)}>{(value !== undefined && value !== null) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}</span>
    </div>
  )

  return (
    <div className="flex flex-col justify-center items-center gap-6 h-full w-full max-w-2xl mx-auto min-h-0 overflow-hidden px-2">
      {/* Information Section */}
      <div className="flex flex-col gap-3 w-full shrink-0">
        <div className="flex items-center justify-center gap-4 bg-white/[0.02] backdrop-blur-3xl px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
          <span className="text-sm font-black text-white uppercase tracking-widest">{symbol}</span>
          <div className="w-[1px] h-4 bg-white/10" />
          <span className="text-base font-black text-white tabular-nums tracking-tighter">
            ₹{todayPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '--'}
          </span>
          <div className={clsx(
            "px-2 py-1 rounded-lg text-[10px] font-black tabular-nums border",
            priceChange && priceChange >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          )}>
            {priceChange !== null && priceChange !== undefined ? (priceChange >= 0 ? '+' : '') + priceChange.toFixed(2) + '%' : '--'}
          </div>
        </div>

        <div className="flex justify-center gap-1.5 bg-black/40 backdrop-blur-2xl p-1 rounded-xl border border-white/5 self-center">
          {intervals.map(i => (
            <button key={i.label} onClick={() => onIntervalClick(i)} className={clsx("px-3 py-1.5 rounded-lg text-[10px] font-black transition-all", i.range === range ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white")}>
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full h-[60dvh] glass rounded-3xl relative overflow-hidden shadow-2xl border border-white/5 mb-6">
        <div ref={chartContainerRef} className="w-full h-full px-2"></div>
      </div>

      {/* Control Section */}
      <div className="flex flex-col items-center gap-6 w-full shrink-0">
        <div className="grid grid-cols-5 gap-2 w-full">
          <StatCard label="Open" value={stats.open} />
          <StatCard label="High" value={stats.high} color="text-emerald-400" />
          <StatCard label="Low" value={stats.low} color="text-rose-400" />
          <StatCard label="Close" value={stats.close} />
          <StatCard label="Volume" value={stats.vol ? `${(stats.vol / 100000).toFixed(1)}L` : null} />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 bg-indigo-600/10 p-2 rounded-2xl border border-indigo-500/20">
          <button onClick={onPrev} disabled={currentStockIndex === 0} className="p-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 disabled:opacity-10 transition-all active:scale-90">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <div className="flex flex-col items-center px-4">
            <span className="text-[10px] font-black text-indigo-400/40 uppercase tracking-widest mb-1">Index</span>
            <span className="text-xl font-black text-indigo-300 tabular-nums leading-none tracking-tighter">
              {currentStockIndex + 1} <span className="text-indigo-900 mx-1">/</span> {totalStocks}
            </span>
          </div>
          <button onClick={onNext} disabled={currentStockIndex === totalStocks - 1} className="p-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 disabled:opacity-10 transition-all active:scale-90">
            <ChevronRight size={24} strokeWidth={3} />
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
    <div className="h-[100dvh] w-full bg-[#020205] text-slate-200 flex flex-col font-sans relative overflow-hidden fixed inset-0">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-600/[0.03] blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-600/[0.03] blur-[150px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 bg-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10"><Activity className="w-6 h-6 text-white" /></div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white leading-none">dotChart</span>
            </div>
          </div>
          <Select value={props.currentCategoryIndex.toString()} onValueChange={(v) => { props.onCategoryChange(Number(v)); setCurrentStockIndex(0); }}>
            <SelectTrigger className="w-[180px] bg-white/[0.03] border-white/5 rounded-xl text-[10px] font-black h-10 px-4 backdrop-blur-xl">
              <SelectValue placeholder="Market Index" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/95 border-white/10 backdrop-blur-3xl rounded-2xl">
              {stockCategories.map((cat, idx) => (
                <SelectItem key={idx} value={idx.toString()} className="text-[10px] font-bold py-2.5">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        <main className="flex-1 overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={`${props.currentCategoryIndex}-${currentStockIndex}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.25 }} className="h-full w-full">
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
