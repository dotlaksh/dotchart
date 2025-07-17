
import smallcapData from '../public/smallcap.json';
import microcapData from '../public/microcap.json';
import ipoData from '../public/ipo.json';





export const stockCategories = [
  { name: 'SmallCaps', data: smallcapData },
  { name: 'MicroCaps', data: microcapData },
  { name: 'IPOs', data: ipoData }


];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


