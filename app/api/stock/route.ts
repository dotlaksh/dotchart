import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache to store API responses
const cache = new Map();

const aggregateCandles = (timestamps: number[], ohlcv: any, interval: string) => {
  const candles = [];
  let currentCandle: any = null;

  for (let i = 0; i < timestamps.length; i++) {
    const date = new Date(timestamps[i] * 1000);
    const priceData = {
      open: ohlcv.open[i],
      high: ohlcv.high[i],
      low: ohlcv.low[i],
      close: ohlcv.close[i],
      volume: ohlcv.volume[i],
    };

    if (interval === '1wk') {
      // Determine Monday of the week
      const monday = new Date(date);
      const dayOfWeek = monday.getUTCDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      monday.setUTCDate(monday.getUTCDate() - daysToSubtract);

      if (!currentCandle || currentCandle.time !== monday.toISOString().split('T')[0]) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = {
          time: monday.toISOString().split('T')[0],
          open: priceData.open,
          high: priceData.high,
          low: priceData.low,
          close: priceData.close,
          volume: priceData.volume,
        };
      }
    } else if (interval === '1mo') {
      // Determine the first day of the month
      const firstDayOfMonth = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1);

      if (!currentCandle || currentCandle.time !== firstDayOfMonth.toISOString().split('T')[0]) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = {
          time: firstDayOfMonth.toISOString().split('T')[0],
          open: priceData.open,
          high: priceData.high,
          low: priceData.low,
          close: priceData.close,
          volume: priceData.volume,
        };
      }
    }

    // Update the current candle with high, low, close, and volume
    currentCandle.high = Math.max(currentCandle.high, priceData.high);
    currentCandle.low = Math.min(currentCandle.low, priceData.low);
    currentCandle.close = priceData.close;
    currentCandle.volume += priceData.volume;
  }

  // Push the last candle
  if (currentCandle) candles.push(currentCandle);

  return candles;
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1y';
  const interval = searchParams.get('interval') || '1d';

  if (!symbol) {
    return NextResponse.json({ details: 'Symbol is required' }, { status: 400 });
  }

  const formattedSymbol = encodeURIComponent(`${symbol}.NS`); // Encode the symbol
  const cacheKey = `${formattedSymbol}-${range}-${interval}`;

  // Check the cache
  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey));
  }

  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`,
      {
        params: { range, interval: '1d', events: 'history', includeAdjustedClose: true }, // Always fetch '1d' data
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }
    );

    const { chart } = response.data;
    if (!chart?.result?.[0]) {
      return NextResponse.json({ details: 'No data available for this symbol' }, { status: 404 });
    }

    const { timestamp, indicators } = chart.result[0];
    const ohlcv = indicators.quote[0];

    // Process data for daily candles
    const dailyData = timestamp.map((ts: number, i: number) => ({
      time: new Date(ts * 1000).toISOString().split('T')[0],
      open: ohlcv.open[i],
      high: ohlcv.high[i],
      low: ohlcv.low[i],
      close: ohlcv.close[i],
      volume: ohlcv.volume[i],
    })).filter(Boolean);

    // Aggregate data for weekly or monthly candles
    const finalData = interval === '1d'
      ? dailyData
      : aggregateCandles(timestamp, ohlcv, interval);

    // Cache the result
    cache.set(cacheKey, finalData);
    if (cache.size > 100) cache.delete(cache.keys().next().value);

    return NextResponse.json(finalData);
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);

    if (error.response?.status === 404) {
      return NextResponse.json({ details: 'Stock symbol not found' }, { status: 404 });
    }

    if (error.response?.status === 429) {
      return NextResponse.json({ details: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    return NextResponse.json({ details: 'Error fetching stock data', error: error.message }, { status: 500 });
  }
}
