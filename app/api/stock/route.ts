import axios from 'axios';

// Cache to store API responses
const cache = new Map();

const aggregateCandles = (timestamps, ohlcv, interval) => {
  const candles = [];
  let currentCandle = null;

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ details: 'Method not allowed' });
  }

  try {
    const { symbol, range = '1y', interval = '1d' } = req.query;

    if (!symbol) {
      return res.status(400).json({ details: 'Symbol is required' });
    }

    const formattedSymbol = `${symbol}.NS`;
    const cacheKey = `${formattedSymbol}-${range}-${interval}`;

    // Check the cache
    if (cache.has(cacheKey)) {
      return res.status(200).json(cache.get(cacheKey));
    }

    // Fetch stock data from Yahoo Finance API
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`,
      {
        params: { range, interval: '1d', events: 'history', includeAdjustedClose: true }, // Always fetch '1d' data
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }
    );

    const { chart } = response.data;
    if (!chart?.result?.[0]) {
      return res.status(404).json({ details: 'No data available for this symbol' });
    }

    const { timestamp, indicators } = chart.result[0];
    const ohlcv = indicators.quote[0];

    // Process data for daily candles
    const dailyData = timestamp.map((ts, i) => ({
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

    return res.status(200).json(finalData);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ details: 'Stock symbol not found' });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({ details: 'Too many requests. Please try again later.' });
    }

    return res.status(500).json({ details: 'Error fetching stock data', error: error.message });
  }
}
