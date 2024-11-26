import nifty50Data from '../public/nifty50.json';
import niftyNext50Data from '../public/niftynext50.json';
import midcap150Data from '../public/midcap150.json';
import smallcap250Data from '../public/smallcap250.json';
import microCap250Data from '../public/microcap250.json';

export const stockCategories = [
  { name: 'Nifty 50', data: nifty50Data },
  { name: 'Nifty Next 50', data: niftyNext50Data },
  { name: 'Midcap 150', data: midcap150Data },
  { name: 'Smallcap 250', data: smallcap250Data },
  { name: 'MicroCap 250', data: microCap250Data },
];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


