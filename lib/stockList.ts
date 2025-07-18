
import smallcapData from '../public/smallcap1.json';
import microcapData from '../public/microcap1.json';
import midcapData from '../public/midcap1.json';

export const stockCategories = [
  { name: 'MidCaps', data: midcapData },
  { name: 'SmallCaps', data: smallcapData },
  { name: 'MicroCaps', data: microcapData }
];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


