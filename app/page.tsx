import StockCarousel from '@/components/StockCarousel'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-6">
      <div className="z-10 w-full max-w-6xl items-center justify-between font-mono text-sm">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">dotChart</h1>
          <ThemeToggle />
        </div>
        <StockCarousel />
      </div>
    </main>
  )
}

