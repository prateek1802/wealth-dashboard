import type { Asset } from "./asset";

export interface WatchlistItem {
  id: string;
  assetId: string;
  asset: Asset;
  targetPrice: number | null;
  stopLoss: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewWatchlistItem = {
  assetId: string;
  targetPrice: number | null;
  stopLoss: number | null;
  note: string | null;
};
