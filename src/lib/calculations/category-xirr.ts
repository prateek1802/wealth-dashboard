import { ASSET_TYPE_GROUP } from "@/constants/asset-types";
import { calculateXIRR } from "./returns";
import { netCashFlow } from "./cashflow";
import type { CalcResult } from "./returns";
import type { Holding } from "@/types/domain/holding";
import type { Transaction } from "@/types/domain/transaction";

export type AssetGroup = "Equity" | "Debt" | "Crypto" | "Other";
const GROUPS: AssetGroup[] = ["Equity", "Debt", "Crypto", "Other"];

export interface CategoryXIRRResult {
  group: AssetGroup;
  result: CalcResult<number>;
  holdingCount: number;
}

/**
 * The grouping key (ASSET_TYPE_GROUP) already existed — this is the first
 * thing to actually use it for XIRR. Applies the same pooling approach as
 * the portfolio-wide XIRR (all transaction cash flows for the group, plus
 * each holding's current value as a final "as if sold today" inflow), just
 * scoped to one asset-class group instead of the whole portfolio — so
 * "is my equity XIRR beating my debt XIRR" is answerable, not just one
 * pooled number across everything.
 *
 * "Cash" is never a key here: computeHoldings() (portfolio.service.ts)
 * already excludes cash-type assets from holdings entirely (tracked via
 * Bank Accounts instead), so no holding ever maps to that group.
 *
 * Scoped to CURRENTLY-HELD holdings — unlike the portfolio-wide XIRR
 * (which pools every transaction ever made, including fully-exited
 * positions), a transaction whose asset isn't in `holdings` contributes
 * nothing here. A category with only fully-exited positions and nothing
 * currently held is therefore omitted entirely, same as a category with
 * no holdings at all.
 *
 * A group with zero holdings is omitted from the result entirely — not
 * reported as insufficient_data, since there's nothing to report on at
 * all, not a data-quality gap.
 */
export function calculateCategoryXIRR(
  holdings: Pick<Holding, "asset" | "currentValue">[],
  transactions: Pick<Transaction, "assetId" | "transactionDate" | "transactionType" | "quantity" | "price" | "fees" | "taxes">[],
  today: string
): CategoryXIRRResult[] {
  const assetIdToGroup = new Map(holdings.map((h) => [h.asset.id, ASSET_TYPE_GROUP[h.asset.assetType] as AssetGroup]));

  const cashflowsByGroup = new Map<AssetGroup, { date: string; amount: number }[]>();
  const currentValueByGroup = new Map<AssetGroup, number>();
  const holdingCountByGroup = new Map<AssetGroup, number>();

  for (const h of holdings) {
    const group = assetIdToGroup.get(h.asset.id);
    if (!group) continue;
    currentValueByGroup.set(group, (currentValueByGroup.get(group) ?? 0) + h.currentValue);
    holdingCountByGroup.set(group, (holdingCountByGroup.get(group) ?? 0) + 1);
  }

  for (const t of transactions) {
    const group = assetIdToGroup.get(t.assetId);
    if (!group) continue;
    const list = cashflowsByGroup.get(group) ?? [];
    list.push({ date: t.transactionDate, amount: netCashFlow(t) });
    cashflowsByGroup.set(group, list);
  }

  const results: CategoryXIRRResult[] = [];
  for (const group of GROUPS) {
    const holdingCount = holdingCountByGroup.get(group) ?? 0;
    if (holdingCount === 0) continue;
    const cashflows = [...(cashflowsByGroup.get(group) ?? [])];
    cashflows.push({ date: today, amount: currentValueByGroup.get(group) ?? 0 });
    results.push({ group, result: calculateXIRR(cashflows), holdingCount });
  }

  return results;
}
