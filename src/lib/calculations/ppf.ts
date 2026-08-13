/**
 * PPF interest earned is derived, never stored — consistent with the rest
 * of the app's "transactions/contributions are truth, balances-of-truth
 * are computed" philosophy. All-time interest = current balance + whatever
 * has been withdrawn over the years - what you originally put in. Without
 * adding back totalWithdrawn, a withdrawal would look like it erased
 * interest you actually already earned and took out.
 */
export function calculatePPFInterestEarned(currentBalance: number, totalContributed: number, totalWithdrawn: number = 0): number {
  return currentBalance + totalWithdrawn - totalContributed;
}
