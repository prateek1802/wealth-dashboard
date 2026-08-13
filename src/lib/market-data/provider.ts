export interface Quote {
  symbol: string;
  price: number;
  asOf: string;
  source: "manual" | "mock" | "live";
}

export interface HistoricalPrice {
  date: string;
  price: number;
}

/**
 * The UI never knows which provider is behind this interface. V1 ships
 * ManualPriceProvider (current_price is entered/updated by hand) and, for
 * local development only, MockMarketDataProvider — clearly labeled, never
 * presented as real market data. A real provider (e.g. a paid quotes API)
 * can be plugged in later without touching any calling code.
 */
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote | null>;
  getHistoricalPrices(symbol: string, days: number): Promise<HistoricalPrice[]>;
}
