
import smallcapData from '../public/smallcap.json';
import microcapData from '../public/microcap.json';
import midcapData from '../public/midcap.json';

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


