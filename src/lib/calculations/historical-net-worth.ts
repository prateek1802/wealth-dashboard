import { calculateHoldingQuantity } from "./holdings";
import { calculateFDValueAsOf } from "./fd";
import type { Transaction } from "@/types/domain/transaction";
import type { Asset } from "@/types/domain/asset";
import type { FixedDeposit } from "@/types/domain/fixed-deposit";
import type { PortfolioSnapshot } from "@/types/domain/snapshot";
import type { PriceHistoryPoint } from "@/types/domain/price-history";

/**
 * Reconstructs "what was net worth actually worth on a real past date",
 * splitting the problem the way PROJECT-STATUS.md's performance-graph work
 * laid it out: WHAT WAS HELD on a date is fully solvable from real
 * transaction dates (no new data — just replaying calculateHoldingQuantity
 * against a filtered transaction list); WHAT IT WAS WORTH depends entirely
 * on whether a real historical price/backfill exists for that date.
 *
 * Deliberately narrow about what "exact" means here: `isExact` reflects
 * only the SECURITIES + FD portion (the part this feature actually solves).
 * Cash, NPS, and PPF/liabilities are NOT reconstructed — see the
 * "leave PPF, banks etc." scoping decision — and always come from the
 * nearest portfolio_snapshots row on or before the requested date,
 * regardless of `isExact`. A caller should not read `isExact: true` as
 * "every rupee on this date is exact" — only "the securities/FD figure is,
 * the rest is still the same approximation as before this feature existed".
 */

export interface HistoricalNetWorthPoint {
  date: string;
  netWorth: number;
  /** True only if every currently-held security on this date had a real historical price (backfilled or manually recorded) — see the module doc comment for what this does NOT cover. */
  isExact: boolean;
}

/** Assumes `history` is sorted ascending by recordedDate — true of priceHistoryRepository.findByAsset()'s existing order. Returns the most recent point on or before `date`, or null if none exists (never picks a later point — that would be looking into the future). */
export function findPriceOnOrBefore(history: Pick<PriceHistoryPoint, "recordedDate" | "price">[], date: string): number | null {
  let result: number | null = null;
  for (const point of history) {
    if (point.recordedDate > date) break;
    result = point.price;
  }
  return result;
}

/** Same idea as findPriceOnOrBefore but for portfolio_snapshots — the fallback source for everything this feature doesn't (yet) reconstruct exactly. Assumes `snapshots` sorted ascending by snapshotDate. */
export function findSnapshotOnOrBefore(snapshots: Pick<PortfolioSnapshot, "snapshotDate" | "netWorth" | "securitiesValue" | "fdValue">[], date: string): PortfolioSnapshot | null {
  let result: PortfolioSnapshot | null = null;
  for (const snap of snapshots) {
    if (snap.snapshotDate > date) break;
    result = snap as PortfolioSnapshot;
  }
  return result;
}

/**
 * One security's value on `date`, or null if it can't be determined exactly
 * (held, but no price on or before that date — e.g. before backfill ran,
 * or before the asset's source itself has history that far back). Returns
 * 0 (not null) if the asset genuinely wasn't held on that date — that's a
 * known, exact fact from the transaction replay, not a missing-data case.
 */
export function reconstructHistoricalAssetValue(
  transactionsForAsset: Transaction[],
  priceHistoryForAsset: Pick<PriceHistoryPoint, "recordedDate" | "price">[],
  date: string
): number | null {
  const heldAsOfDate = transactionsForAsset.filter((t) => t.transactionDate <= date);
  const quantity = calculateHoldingQuantity(heldAsOfDate);
  if (quantity <= 1e-9) return 0;
  const price = findPriceOnOrBefore(priceHistoryForAsset, date);
  if (price === null) return null;
  return quantity * price;
}

export interface ReconstructInput {
  date: string;
  securityAssets: Asset[]; // assets in BACKFILLABLE_ASSET_TYPES only — see historical-provider.ts
  transactionsByAsset: Map<string, Transaction[]>;
  priceHistoryByAsset: Map<string, Pick<PriceHistoryPoint, "recordedDate" | "price">[]>;
  fixedDeposits: FixedDeposit[];
  snapshotsSortedAsc: Pick<PortfolioSnapshot, "snapshotDate" | "netWorth" | "securitiesValue" | "fdValue">[];
}

export function reconstructHistoricalNetWorth(input: ReconstructInput): HistoricalNetWorthPoint {
  const { date, securityAssets, transactionsByAsset, priceHistoryByAsset, fixedDeposits, snapshotsSortedAsc } = input;

  const nearestSnapshot = findSnapshotOnOrBefore(snapshotsSortedAsc, date);
  // The part of net worth this feature doesn't reconstruct (cash/NPS/PPF/
  // liabilities), derived by subtraction so it never needs to know their
  // individual signs — see the module doc comment.
  const residual = nearestSnapshot ? nearestSnapshot.netWorth - nearestSnapshot.securitiesValue - nearestSnapshot.fdValue : 0;

  let securitiesValue = 0;
  let allSecuritiesExact = true;
  for (const asset of securityAssets) {
    const txns = transactionsByAsset.get(asset.id) ?? [];
    const history = priceHistoryByAsset.get(asset.id) ?? [];
    const value = reconstructHistoricalAssetValue(txns, history, date);
    if (value === null) {
      allSecuritiesExact = false;
      // Missing price for a security actually held on this date — fall
      // back to the whole snapshot's securities figure for this date
      // rather than a partial, silently-incomplete sum (see module doc
      // comment: never fabricate, and never silently mix exact partial
      // sums with an approximated total).
      securitiesValue = nearestSnapshot?.securitiesValue ?? 0;
      break;
    }
    securitiesValue += value;
  }

  const fdValue = fixedDeposits.reduce((sum, fd) => sum + calculateFDValueAsOf(fd, date), 0);

  return {
    date,
    netWorth: securitiesValue + fdValue + residual,
    isExact: allSecuritiesExact, // FD is always exact (deterministic, no external dependency) — only securities can fail to be
  };
}
