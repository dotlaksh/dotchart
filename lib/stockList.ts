
import niftyData from '../public/fno.json';
import midcapData from '../public/midcap.json';
import smallcapData from '../public/smallcap.json';



export const stockCategories = [
  { name: 'F&O', data: niftyData },
  { name: 'Midcaps', data: midcapData },
  { name: 'Smallcaps', data: smallcapData }

];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};


