import { priceHistoryRepository } from "@/lib/database/repositories/price-history.repository";

export const priceHistoryService = {
  async getHistory(assetId: string) {
    return priceHistoryRepository.findByAsset(assetId);
  },

  /** Called from every place a price actually changes — manual Edit Asset entry and Refresh Prices. Never called speculatively; a gap in history just means the price wasn't touched that day. */
  async record(assetId: string, price: number) {
    return priceHistoryRepository.recordToday(assetId, price);
  },

  /**
   * One-time historical backfill for one asset — fetches its real
   * historical price series (see lib/market-data/historical-provider.ts)
   * and stores it with source='backfill'. Manually triggered (an explicit
   * "Backfill history" action), never run automatically on page load or on
   * every Refresh Prices — see that module's doc comment for why.
   */
  async backfillHistory(assetId: string): Promise<{ pointsAdded: number }> {
    const { assetsRepository } = await import("@/lib/database/repositories/assets.repository");
    const { fetchHistoricalPricesForAsset } = await import("@/lib/market-data/historical-provider");
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new Error("Asset not found");
    const points = await fetchHistoricalPricesForAsset(asset);
    const pointsAdded = await priceHistoryRepository.recordBackfillBatch(assetId, points);
    return { pointsAdded };
  },
};
