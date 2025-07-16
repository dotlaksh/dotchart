
import smallcapData from '../public/smallcap.json';
import microcapData from '../public/microcap.json';
import othersData from '../public/others.json';




export const stockCategories = [
  { name: 'SmallCaps', data: smallcapData },
  { name: 'MicroCaps', data: microcapData },
  { name: 'Others', data: othersData }

];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


