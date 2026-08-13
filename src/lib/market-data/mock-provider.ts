import type { MarketDataProvider, Quote, HistoricalPrice } from "./provider";

/**
 * DEVELOPMENT-ONLY mock provider. Generates a deterministic pseudo-random
 * walk so charts have something to render locally. NEVER used in
 * production — labeled `source: "mock"` end to end so it can never be
 * mistaken for a real market price.
 */
export const mockMarketDataProvider: MarketDataProvider = {
  async getQuote(symbol: string): Promise<Quote> {
    const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    return { symbol, price: 100 + (seed % 500), asOf: new Date().toISOString(), source: "mock" };
  },

  async getHistoricalPrices(symbol: string, days: number): Promise<HistoricalPrice[]> {
    const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 1);
    let price = 100 + (seed % 500);
    const points: HistoricalPrice[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      price *= 1 + (Math.sin(seed + i) * 0.01);
      points.push({ date: date.toISOString().slice(0, 10), price: Math.round(price * 100) / 100 });
    }
    return points;
  },
};
