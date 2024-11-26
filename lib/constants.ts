import nifty50Data from '../public/nifty50.json';
import niftyNext50Data from '../public/niftynext50.json';
import midcap150Data from '../public/midcap150.json';
import smallcap250Data from '../public/smallcap250.json';
import microCap250Data from '../public/microcap250.json';

export const indexData = [
  { label: 'Nifty 50', data: nifty50Data },
  { label: 'Nifty Next 50', data: niftyNext50Data },
  { label: 'Midcap 150', data: midcap150Data },
  { label: 'Smallcap 250', data: smallcap250Data },
  { label: 'MicroCap 250', data: microCap250Data },
];

export const INTERVALS = [
  { label: '1D', value: 'daily', interval: '1d', range: '1y' },
  { label: '1W', value: 'weekly', interval: '1wk', range: '5y' },
  { label: '1M', value: 'monthly', interval: '1mo', range: 'max' },
];

export const RANGES = [
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
  { label: 'Max', value: 'max' },
];

export const STOCKS_PER_PAGE = 15;

