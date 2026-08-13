import type { Lot, Transaction } from "@/types/domain/transaction";

/**
 * FIFO lot matching — used ONLY for realized P&L. Never feeds the displayed
 * average cost (see holdings.ts). Walks BUYs as a FIFO queue of open lots
 * and consumes them (oldest first) as SELLs are encountered.
 *
 * Returns the REMAINING open lots (i.e. what's still held) after all SELLs
 * have consumed their share. Realized P&L is computed alongside this by
 * calculateRealizedPnL, which tracks what was consumed rather than what's left.
 */
export function matchFIFOLots(transactions: Transaction[]): Lot[] {
  const ordered = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  const openLots: Lot[] = [];

  for (const t of ordered) {
    if (t.transactionType === "BUY") {
      const costBasisPerUnit = t.price + (t.fees + t.taxes) / t.quantity;
      openLots.push({
        quantity: t.quantity,
        costBasisPerUnit,
        acquiredDate: t.transactionDate,
      });
      continue;
    }

    // SELL: consume oldest open lots first.
    let remainingToSell = t.quantity;
    while (remainingToSell > 1e-9 && openLots.length > 0) {
      const lot = openLots[0];
      const consumed = Math.min(lot.quantity, remainingToSell);
      lot.quantity -= consumed;
      remainingToSell -= consumed;
      if (lot.quantity <= 1e-9) openLots.shift();
    }
  }

  return openLots;
}

/**
 * Realized P&L via FIFO: for every SELL, proceeds (net of fees/taxes) minus
 * the FIFO-matched cost basis of the units actually sold.
 */
export function calculateRealizedPnL(transactions: Transaction[]): number {
  const ordered = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  const openLots: Lot[] = [];
  let realizedPnl = 0;

  for (const t of ordered) {
    if (t.transactionType === "BUY") {
      const costBasisPerUnit = t.price + (t.fees + t.taxes) / t.quantity;
      openLots.push({ quantity: t.quantity, costBasisPerUnit, acquiredDate: t.transactionDate });
      continue;
    }

    const sellProceedsPerUnit = t.price - (t.fees + t.taxes) / t.quantity;
    let remainingToSell = t.quantity;

    while (remainingToSell > 1e-9 && openLots.length > 0) {
      const lot = openLots[0];
      const consumed = Math.min(lot.quantity, remainingToSell);
      realizedPnl += consumed * (sellProceedsPerUnit - lot.costBasisPerUnit);
      lot.quantity -= consumed;
      remainingToSell -= consumed;
      if (lot.quantity <= 1e-9) openLots.shift();
    }
    // If remainingToSell > 0 here, the data has more SELL quantity than ever
    // bought — a data-entry problem the validation layer should have caught.
    // We do not throw inside a pure calculation function; it's simply ignored.
  }

  return realizedPnl;
}
