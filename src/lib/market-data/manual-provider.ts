import type { MarketDataProvider, Quote, HistoricalPrice } from "./provider";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";

/**
 * V1's real provider: prices come from whatever was last entered via
 * "Update current price" on an asset. No external network calls.
 */
export const manualPriceProvider: MarketDataProvider = {
  async getQuote(symbol: string): Promise<Quote | null> {
    const assets = await assetsRepository.findAll();
    const asset = assets.find((a) => a.symbol === symbol);
    if (!asset || asset.currentPrice === null) return null;
    return {
      symbol: asset.symbol,
      price: asset.currentPrice,
      asOf: asset.currentPriceUpdatedAt ?? asset.updatedAt,
      source: "manual",
    };
  },

  async getHistoricalPrices(): Promise<HistoricalPrice[]> {
    // Manual entry has no history by definition — return empty, and let the
    // UI show the "insufficient data" state rather than fabricating a curve.
    return [];
  },
};
