// pages/api/stockData.js
import axios from 'axios';

// Function to format date to Unix timestamp
const getUnixTimestamp = (dateString) => {
  return Math.floor(new Date(dateString).getTime() / 1000);
};

// Cache object to store API responses
const cache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ details: 'Method not allowed' });
  }

  try {
    const { symbol, startDate, endDate } = req.query;

    if (!symbol) {
      return res.status(400).json({ details: 'Symbol is required' });
    }

    // Create cache key
    const cacheKey = `${symbol}-${startDate}-${endDate}`;

    // Check cache first
    if (cache.has(cacheKey)) {
      return res.status(200).json(cache.get(cacheKey));
    }

    // Add .NS suffix for NSE stocks
    const formattedSymbol = `${symbol}.NS`;

    // Convert dates to Unix timestamps
    const period1 = getUnixTimestamp(startDate);
    const period2 = getUnixTimestamp(endDate);

    // Fetch data from Yahoo Finance
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`, {
      params: {
        period1,
        period2,
        interval: '1d',  // daily intervals
        events: 'history',
        includeAdjustedClose: true
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const result = response.data;

    if (!result.chart || !result.chart.result || !result.chart.result[0]) {
      return res.status(404).json({ details: 'No data available for this symbol' });
    }

    const quotes = result.chart.result[0];
    const timestamps = quotes.timestamp;
    const ohlcv = quotes.indicators.quote[0];
    const adjClose = quotes.indicators.adjclose?.[0]?.adjclose || ohlcv.close;

    // Process the data into the format needed by the chart
    const processedData = timestamps.map((timestamp, index) => {
      // Skip any data points where we don't have complete OHLCV data
      if (!ohlcv.open[index] || !ohlcv.high[index] || !ohlcv.low[index] || 
          !ohlcv.close[index] || !ohlcv.volume[index]) {
        return null;
      }

      return {
        time: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: parseFloat(ohlcv.open[index].toFixed(2)),
        high: parseFloat(ohlcv.high[index].toFixed(2)),
        low: parseFloat(ohlcv.low[index].toFixed(2)),
        close: parseFloat(ohlcv.close[index].toFixed(2)),
        volume: parseInt(ohlcv.volume[index])
      };
    }).filter(item => item !== null);

    // Store in cache
    cache.set(cacheKey, processedData);

    // Clear old cache entries if cache gets too large
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    res.status(200).json(processedData);

  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        details: 'Stock symbol not found'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        details: 'Too many requests. Please try again later.'
      });
    }

    res.status(500).json({ 
      details: 'Error fetching stock data', 
      error: error.message 
    });
  }
}

// Configure API route config
export const config = {
  api: {
    externalResolver: true,
  },
};
