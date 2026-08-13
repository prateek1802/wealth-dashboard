import Papa from "papaparse";

/**
 * Normalizes a CSV header to a canonical field key: lowercase, strip
 * spaces/underscores/hyphens. Lets the importer accept "Asset Type",
 * "asset_type", "assetType", "Asset-Type" etc. all as the same column,
 * so a spreadsheet exported from Excel/Sheets doesn't need exact casing.
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  transactiondate: "date",
  symbol: "symbol",
  ticker: "symbol",
  name: "name",
  assetname: "name",
  assettype: "assetType",
  transactiontype: "type",
  type: "type",
  buysell: "type",
  quantity: "quantity",
  qty: "quantity",
  units: "quantity",
  price: "price",
  priceperunit: "price",
  fees: "fees",
  fee: "fees",
  taxes: "taxes",
  tax: "taxes",
  currency: "currency",
  exchange: "exchange",
  broker: "broker",
  notes: "notes",
  note: "notes",
};

/** Parses raw CSV text into an array of plain objects keyed by canonical field names, ready for transactionImportRowSchema. */
export function parseTransactionsCSV(csvText: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => HEADER_ALIASES[normalizeHeader(header)] ?? header,
  });
  return parsed.data;
}

export const TRANSACTION_IMPORT_TEMPLATE = `date,symbol,name,assetType,type,quantity,price,fees,taxes,currency,exchange,broker,notes
2023-04-15,HDFCBANK,HDFC Bank Ltd,stock_in,BUY,30,1420,45,12,INR,NSE,Zerodha,
2023-09-02,TCS,Tata Consultancy Services,stock_in,BUY,10,3850,30,8,INR,NSE,Zerodha,
2024-01-10,119551,Parag Parikh Flexi Cap Fund - Direct Growth,mutual_fund,BUY,500,62.4,0,0,INR,,Direct - MFU,
`;
