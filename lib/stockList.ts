
import niftyData from '../public/nifty.json';
import ipoData from '../public/ipo.json';


export const stockCategories = [
  { name: 'Nifty', data: niftyData },
  { name: 'IPO', data: ipoData }

];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


