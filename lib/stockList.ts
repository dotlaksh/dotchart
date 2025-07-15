import stocksData from '../public/others.json';




export const stockCategories = [
  { name: 'Stocks', data: stocksData }

];

export type Stock = {
  Symbol: string;
  "Company Name": string;
};

export type StockCategory = {
  name: string;
  data: Stock[];
};

