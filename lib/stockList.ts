
import niftyData from '../public/fno.json';
import midcapData from '../public/uptrend.json';
import smallcapData from '../public/smallcap.json';
import microcapData from '../public/microcap.json';




export const stockCategories = [
  { name: 'F&O', data: niftyData },
  { name: 'Uptrend', data: midcapData },
  { name: 'Smallcaps', data: smallcapData },
  { name: 'Microcaps', data: microcapData }


];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


