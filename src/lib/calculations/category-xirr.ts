import { ASSET_TYPE_LABELS, SECURITY_ASSET_TYPES } from "@/constants/asset-types";
import { NPS_SCHEME_LABELS, NPS_SCHEMES } from "@/constants/nps";
import { calculateXIRR } from "./returns";
import { netCashFlow } from "./cashflow";
import type { CalcResult } from "./returns";
import type { Holding } from "@/types/domain/holding";
import type { Transaction } from "@/types/domain/transaction";
import type { AssetType } from "@/constants/asset-types";
import type { NPSScheme } from "@/constants/nps";
import type { NPSSchemeHolding, NPSSchemeTransaction } from "@/types/domain/nps";

export interface CategoryXIRRResult {
  /** Stable identity for a React key — an AssetType, or "nps_<scheme>" for an NPS row. */
  key: string;
  label: string;
  result: CalcResult<number>;
  /** Securities holdings or NPS scheme holdings contributing to this row. */
  count: number;
}

/**
 * Per-asset-TYPE XIRR (Indian Stock, US Stock, ETF, Equity MF, Debt MF,
 * Bond, Crypto — each its own row) plus one row per NPS scheme (E/C/G/A).
 *
 * Deliberately NOT grouped by the coarser ASSET_TYPE_GROUP (Equity/Debt/
 * Crypto/Other) — an earlier version of this did that, which silently
 * pooled Indian stocks, US stocks, ETFs, and equity mutual funds into one
 * "Equity" number with no way to see an individual asset type's own XIRR
 * (e.g. "my Indian stocks specifically" got no number of its own; only
 * Crypto looked distinct, because Crypto happens to be a 1:1 type-to-group
 * mapping). This is the finer breakdown that actually answers that.
 *
 * NPS is broken down the same way — by INDIVIDUAL scheme (E/C/G/A), not
 * folded into Equity/Debt/Other — for the same reason: "my NPS Equity (E)
 * sleeve's own XIRR" is a real, different question from "my NPS Corporate
 * Bonds (C) sleeve's XIRR". This only reads already-computed NPS scheme
 * holdings/transactions — none of NPS's own live-NAV-refresh or staleness
 * logic is touched by any of this.
 *
 * NPS switches (switch_in/switch_out — money moved between E/C/G/A
 * *within* the same NPS account, no cash actually entering or leaving the
 * subscriber's pocket) are DELIBERATELY EXCLUDED, same as the account-level
 * pooled NPS XIRR elsewhere in this codebase. A scheme whose corpus grew
 * mainly through internal switches rather than direct contributions will
 * therefore show an incomplete or insufficient_data result — a known,
 * deliberate scope limit: correctly attributing a switch as a
 * "contribution" to the destination scheme (and a "withdrawal" from the
 * source) is real, non-trivial modeling work that hasn't been built yet.
 *
 * "Cash" is excluded entirely (not in SECURITY_ASSET_TYPES) — it's tracked
 * via Bank Accounts, not as a security with quantity/price.
 *
 * Scoped to CURRENTLY-HELD holdings for securities — unlike the
 * portfolio-wide XIRR (which pools every transaction ever made, including
 * fully-exited positions), a transaction whose asset isn't in `holdings`
 * contributes nothing here.
 *
 * A row with nothing in it at all is omitted — not reported as
 * insufficient_data, since there's nothing to report on, not a
 * data-quality gap.
 */
export function calculateCategoryXIRR(
  holdings: Pick<Holding, "asset" | "currentValue">[],
  transactions: Pick<Transaction, "assetId" | "transactionDate" | "transactionType" | "quantity" | "price" | "fees" | "taxes">[],
  npsSchemeHoldings: Pick<NPSSchemeHolding, "scheme" | "unitsHeld" | "lastNav">[] = [],
  npsSchemeTransactions: Pick<NPSSchemeTransaction, "scheme" | "transactionDate" | "transactionType" | "amount">[] = [],
  today: string
): CategoryXIRRResult[] {
  const assetIdToType = new Map(holdings.map((h) => [h.asset.id, h.asset.assetType]));

  const cashflowsByType = new Map<AssetType, { date: string; amount: number }[]>();
  const currentValueByType = new Map<AssetType, number>();
  const countByType = new Map<AssetType, number>();

  for (const h of holdings) {
    currentValueByType.set(h.asset.assetType, (currentValueByType.get(h.asset.assetType) ?? 0) + h.currentValue);
    countByType.set(h.asset.assetType, (countByType.get(h.asset.assetType) ?? 0) + 1);
  }

  for (const t of transactions) {
    const type = assetIdToType.get(t.assetId);
    if (!type) continue;
    const list = cashflowsByType.get(type) ?? [];
    list.push({ date: t.transactionDate, amount: netCashFlow(t) });
    cashflowsByType.set(type, list);
  }

  const results: CategoryXIRRResult[] = [];

  for (const type of SECURITY_ASSET_TYPES) {
    const count = countByType.get(type) ?? 0;
    if (count === 0) continue;
    const cashflows = [...(cashflowsByType.get(type) ?? [])];
    cashflows.push({ date: today, amount: currentValueByType.get(type) ?? 0 });
    results.push({ key: type, label: ASSET_TYPE_LABELS[type], result: calculateXIRR(cashflows), count });
  }

  const cashflowsByScheme = new Map<NPSScheme, { date: string; amount: number }[]>();
  const currentValueByScheme = new Map<NPSScheme, number>();
  const countByScheme = new Map<NPSScheme, number>();

  for (const h of npsSchemeHoldings) {
    currentValueByScheme.set(h.scheme, (currentValueByScheme.get(h.scheme) ?? 0) + h.unitsHeld * (h.lastNav ?? 0));
    countByScheme.set(h.scheme, (countByScheme.get(h.scheme) ?? 0) + 1);
  }

  for (const t of npsSchemeTransactions) {
    if (t.transactionType !== "contribution" && t.transactionType !== "withdrawal") continue; // switches excluded — see doc comment
    const list = cashflowsByScheme.get(t.scheme) ?? [];
    list.push({ date: t.transactionDate, amount: -t.amount });
    cashflowsByScheme.set(t.scheme, list);
  }

  for (const scheme of NPS_SCHEMES) {
    const count = countByScheme.get(scheme) ?? 0;
    if (count === 0) continue;
    const cashflows = [...(cashflowsByScheme.get(scheme) ?? [])];
    cashflows.push({ date: today, amount: currentValueByScheme.get(scheme) ?? 0 });
    results.push({ key: `nps_${scheme}`, label: `NPS — ${NPS_SCHEME_LABELS[scheme]}`, result: calculateXIRR(cashflows), count });
  }

  return results;
}
