import type { Transaction } from "@/types/domain/transaction";
import { netCashFlow } from "./cashflow";
import { matchFIFOLots } from "./lots";

/**
 * Net units currently held. SELLs reduce quantity; the caller is responsible
 * for not passing more SELL quantity than has been bought (validated at the
 * service layer, not here — this is a pure fold).
 */
export function calculateHoldingQuantity(transactions: Transaction[]): number {
  return transactions.reduce((qty, t) => {
    return t.transactionType === "BUY" ? qty + t.quantity : qty - t.quantity;
  }, 0);
}

/**
 * Weighted-average cost per unit of CURRENTLY HELD units, including buy-side
 * fees/taxes folded into cost basis. This answers "what am I holding it at,
 * on average".
 *
 * Implementation: derived from the same FIFO lot matching used for realized
 * P&L (see lots.ts) — each SELL consumes the oldest open lot(s) first, and
 * the average is the size-weighted average cost of whatever lots remain
 * open. This replaces a prior single-blended-pool implementation where a
 * SELL was priced off the running average at that instant, which meant a
 * same-day offsetting BUY+SELL (net quantity unchanged) could still shift
 * the displayed average cost — since the SELL was blending in the new BUY's
 * price rather than being matched against a specific lot. FIFO matching
 * fixes that: the average only moves when a specific lot is actually
 * consumed or added.
 */
export function calculateWeightedAverageCost(transactions: Transaction[]): number {
  const openLots = matchFIFOLots(transactions);

  const quantity = openLots.reduce((sum, lot) => sum + lot.quantity, 0);
  if (quantity <= 0) return 0;

  const totalCost = openLots.reduce((sum, lot) => sum + lot.quantity * lot.costBasisPerUnit, 0);
  return totalCost / quantity;
}

export function calculateInvestedAmount(transactions: Transaction[]): number {
  const quantity = calculateHoldingQuantity(transactions);
  const avgCost = calculateWeightedAverageCost(transactions);
  return quantity * avgCost;
}

/** Sum of net cash flows across a transaction set — used by XIRR. */
export function calculateNetCashInvested(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + netCashFlow(t), 0);
}
