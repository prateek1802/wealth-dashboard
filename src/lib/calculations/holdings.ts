import type { Transaction } from "@/types/domain/transaction";
import { netCashFlow } from "./cashflow";

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
 * on average" — it is NOT used for realized P&L (see lots.ts for that).
 *
 * Implementation: walk transactions in date order maintaining a running
 * (quantity, totalCost) position. SELLs reduce quantity proportionally
 * without changing the average cost of what remains (standard weighted-
 * average accounting) — they do NOT trigger a FIFO lot lookup here, since
 * that lookup only matters for realized P&L, not for the displayed average.
 */
export function calculateWeightedAverageCost(transactions: Transaction[]): number {
  const ordered = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  let quantity = 0;
  let totalCost = 0;

  for (const t of ordered) {
    if (t.transactionType === "BUY") {
      const buyCost = t.quantity * t.price + t.fees + t.taxes;
      totalCost += buyCost;
      quantity += t.quantity;
    } else {
      if (quantity <= 0) continue;
      const avgCostBefore = totalCost / quantity;
      const costRemoved = avgCostBefore * t.quantity;
      totalCost -= costRemoved;
      quantity -= t.quantity;
    }
  }

  if (quantity <= 0) return 0;
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
