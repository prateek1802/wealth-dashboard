import type { Transaction } from "@/types/domain/transaction";

/** Gross trade value before fees/taxes. Always derived — never stored. */
export function grossValue(txn: Pick<Transaction, "quantity" | "price">): number {
  return txn.quantity * txn.price;
}

/**
 * Net cash flow of a single transaction, from the investor's point of view.
 * BUY:  cash OUT = -(quantity * price + fees + taxes)
 * SELL: cash IN  =  (quantity * price - fees - taxes)
 *
 * This is the single source of truth for fee/tax handling — invested amount,
 * realized P&L, and XIRR all call this rather than re-deriving it.
 */
export function netCashFlow(
  txn: Pick<Transaction, "quantity" | "price" | "fees" | "taxes" | "transactionType">
): number {
  const gross = grossValue(txn);
  if (txn.transactionType === "BUY") {
    return -(gross + txn.fees + txn.taxes);
  }
  return gross - txn.fees - txn.taxes;
}
