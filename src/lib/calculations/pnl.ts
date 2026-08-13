import type { Transaction } from "@/types/domain/transaction";
import { calculateHoldingQuantity, calculateWeightedAverageCost, calculateInvestedAmount } from "./holdings";
import { calculateRealizedPnL } from "./lots";

export function calculateCurrentValue(quantity: number, currentPrice: number | null): number {
  if (currentPrice === null) return 0;
  return quantity * currentPrice;
}

export function calculateUnrealizedPnL(currentValue: number, investedAmount: number): number {
  return currentValue - investedAmount;
}

export function calculateReturnPercentage(pnl: number, base: number): number {
  if (base === 0) return 0;
  return (pnl / base) * 100;
}

/** Convenience aggregate for a single asset's transaction history + live price. */
export function summarizeAssetPosition(transactions: Transaction[], currentPrice: number | null) {
  const quantity = calculateHoldingQuantity(transactions);
  const weightedAverageCost = calculateWeightedAverageCost(transactions);
  const investedAmount = calculateInvestedAmount(transactions);
  const currentValue = calculateCurrentValue(quantity, currentPrice);
  const unrealizedPnl = calculateUnrealizedPnL(currentValue, investedAmount);
  const unrealizedPnlPercent = calculateReturnPercentage(unrealizedPnl, investedAmount);
  const realizedPnl = calculateRealizedPnL(transactions);

  return {
    quantity,
    weightedAverageCost,
    investedAmount,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPercent,
    realizedPnl,
  };
}
