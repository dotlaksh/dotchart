
import smallcapData from '../public/smallcap.json';
import microcapData from '../public/microcap.json';
import midcapData from '../public/midcap.json';

import smallcap1Data from '../public/smallcap1.json';
import microcap1Data from '../public/microcap1.json';
import midcap1Data from '../public/midcap1.json';


export const stockCategories = [
  { name: 'MidCaps', data: midcapData },
  { name: 'SmallCaps', data: smallcapData },
  { name: 'MicroCaps', data: microcapData },
  { name: 'MidCaps1', data: midcap1Data },
  { name: 'SmallCaps1', data: smallcap1Data },
  { name: 'MicroCaps1', data: microcap1Data }
];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


