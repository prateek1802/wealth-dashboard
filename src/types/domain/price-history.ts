export interface PriceHistoryPoint {
  id: string;
  assetId: string;
  price: number;
  recordedDate: string; // ISO date, at most one row per (assetId, recordedDate)
  source: "manual" | "backfill";
  createdAt: string;
}
