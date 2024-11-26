import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache object to store API responses
const cache = new Map();

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '2y';
  const interval = searchParams.get('interval') || '1d';

  if (!symbol) {
    return NextResponse.json({ details: 'Symbol is required' }, { status: 400 });
  }

  // Add `.NS` suffix for NSE-listed stocks
  const formattedSymbol = `${symbol}.NS`;

  // Create cache key
  const cacheKey = `${formattedSymbol}-${range}-${interval}`;

  // Check cache first
  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey));
  }

  try {
    // Fetch stock data from Yahoo Finance API
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`,
      {
        params: { range, interval, events: 'history', includeAdjustedClose: true },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      }
    );

    const result = response.data;

    // Check if the response contains valid data
    if (!result.chart || !result.chart.result || !result.chart.result[0]) {
      return NextResponse.json({ details: 'No data available for this symbol' }, { status: 404 });
    }

    const quotes = result.chart.result[0];
    const timestamps = quotes.timestamp;
    const ohlcv = quotes.indicators.quote[0];
    const adjClose = quotes.indicators.adjclose?.[0]?.adjclose || ohlcv.close;

    // Process the data into the format needed by the chart
    let processedData = timestamps.map((timestamp: number, index: number) => {
      if (
        !ohlcv.open[index] ||
        !ohlcv.high[index] ||
        !ohlcv.low[index] ||
        !ohlcv.close[index] ||
        !ohlcv.volume[index]
      ) {
        return null;
      }

      // Convert timestamp to Date object
      const date = new Date(timestamp * 1000);
      
      // For weekly data, adjust the timestamp to Monday of that week
      if (interval === '1wk') {
        const dayOfWeek = date.getUTCDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        date.setUTCDate(date.getUTCDate() - daysToSubtract);
      }
      // For monthly data, adjust the timestamp to the first day of the month
      else if (interval === '1mo') {
        date.setUTCDate(1);
      }

      return {
        time: date.toISOString().split('T')[0],
        open: parseFloat(ohlcv.open[index].toFixed(2)),
        high: parseFloat(ohlcv.high[index].toFixed(2)),
        low: parseFloat(ohlcv.low[index].toFixed(2)),
        close: parseFloat(ohlcv.close[index].toFixed(2)),
        volume: parseInt(ohlcv.volume[index]),
      };
    }).filter((item: any) => item !== null);

    // Handle incomplete candles for weekly and monthly intervals
    if (interval === '1wk' || interval === '1mo') {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);

      let currentPeriodStart;
      if (interval === '1wk') {
        const dayOfWeek = now.getUTCDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        currentPeriodStart = new Date(now);
        currentPeriodStart.setUTCDate(now.getUTCDate() - daysToSubtract);
      } else if (interval === '1mo') {
        currentPeriodStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
      }

      const lastCompleteCandle = processedData[processedData.length - 1];
      const lastCandleDate = new Date(lastCompleteCandle.time);

      if (lastCandleDate < currentPeriodStart) {
        // Add a new candle for the current period
        const currentCandle = {
          time: currentPeriodStart.toISOString().split('T')[0],
          open: lastCompleteCandle.close,
          high: Math.max(...processedData.filter((d: any) => new Date(d.time) >= currentPeriodStart).map((d: any) => d.high)),
          low: Math.min(...processedData.filter((d: any) => new Date(d.time) >= currentPeriodStart).map((d: any) => d.low)),
          close: processedData[processedData.length - 1].close,
          volume: processedData.filter((d: any) => new Date(d.time) >= currentPeriodStart).reduce((sum: number, d: any) => sum + d.volume, 0),
        };
        processedData.push(currentCandle);
      } else {
        // Update the last candle with the current period's data
        const currentPeriodData = processedData.filter((d: any) => new Date(d.time) >= currentPeriodStart);
        lastCompleteCandle.high = Math.max(lastCompleteCandle.high, ...currentPeriodData.map((d: any) => d.high));
        lastCompleteCandle.low = Math.min(lastCompleteCandle.low, ...currentPeriodData.map((d: any) => d.low));
        lastCompleteCandle.close = processedData[processedData.length - 1].close;
        lastCompleteCandle.volume += currentPeriodData.reduce((sum: number, d: any) => sum + d.volume, 0);
      }
    }

    // Store response in cache
    cache.set(cacheKey, processedData);

    // Limit cache size to 100 entries
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    // Send the processed data back to the client
    return NextResponse.json(processedData);
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);

    // Handle specific error cases
    if (error.response?.status === 404) {
      return NextResponse.json({ details: 'Stock symbol not found' }, { status: 404 });
    }

    if (error.response?.status === 429) {
      return NextResponse.json({ details: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Handle other errors
    return NextResponse.json({ details: 'Error fetching stock data', error: error.message }, { status: 500 });
  }
}

