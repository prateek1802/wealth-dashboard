import { priceHistoryRepository } from "@/lib/database/repositories/price-history.repository";

export const priceHistoryService = {
  async getHistory(assetId: string) {
    return priceHistoryRepository.findByAsset(assetId);
  },

  /** Called from every place a price actually changes — manual Edit Asset entry and Refresh Prices. Never called speculatively; a gap in history just means the price wasn't touched that day. */
  async record(assetId: string, price: number) {
    return priceHistoryRepository.recordToday(assetId, price);
  },
};
