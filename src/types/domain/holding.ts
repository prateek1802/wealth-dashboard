import type { Asset } from "./asset";

/** Computed, never stored — derived from an asset's transaction history on read. */
export interface Holding {
  asset: Asset;
  quantity: number;
  weightedAverageCost: number;
  investedAmount: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  allocationPercent: number;
}
