export interface StockData {
  Symbol: string;
  "Company Name": string;
}

export interface Stock {
  symbol: string;
  name: string;
}

export interface IndexData {
  label: string;
  data: StockData[];
}

export interface CurrentStock extends Stock {
  price?: number;
  change?: number;
  todayChange?: number;
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

