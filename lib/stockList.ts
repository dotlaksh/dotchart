import largecapData from '../public/largecap.json';
import midcapData from '../public/midcap.json';
import smallcapData from '../public/smallcap.json';
import microCapData from '../public/microcap.json';
import othersData from '../public/others.json';


export const stockCategories = [
  { name: 'Largecap', data: largecapData },
  { name: 'Midcap', data: midcapData },
  { name: 'Smallcap', data: smallcapData },
  { name: 'MicroCap', data: microCapData },
  { name: 'Others', data: othersData },

];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};

