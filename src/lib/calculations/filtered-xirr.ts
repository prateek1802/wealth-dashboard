import { calculateXIRR } from "./returns";
import { netCashFlow } from "./cashflow";
import type { CalcResult, Cashflow } from "./returns";
import type { AssetType, TransactionType } from "@/constants/asset-types";

/**
 * The checkbox granularity the redesign spec calls for — asset-CLASS level,
 * not individual holdings. Deliberately coarser than calculateCategoryXIRR
 * (which splits Indian Stock/US Stock separately) — two different features
 * with two different appropriate granularities, not a conflict.
 *
 * "cash" and "other" asset types have no checkbox here: cash-type assets
 * are already excluded from holdings entirely (tracked via Bank Accounts),
 * and "other" isn't in the redesign spec's stated checkbox list. A holding
 * of type "other" is therefore never included in this feature's XIRR,
 * however the checkboxes are set — a narrow, known scope limit.
 */
export const XIRR_CLASSES = ["stocks", "etf", "mutual_fund_equity", "mutual_fund_debt", "crypto", "bonds", "nps"] as const;
export type XIRRClass = (typeof XIRR_CLASSES)[number];

export const XIRR_CLASS_LABELS: Record<XIRRClass, string> = {
  stocks: "Stocks",
  etf: "ETF",
  mutual_fund_equity: "Mutual Fund Equity",
  mutual_fund_debt: "Mutual Fund Debt",
  crypto: "Crypto",
  bonds: "Bonds",
  nps: "NPS",
};

const ASSET_TYPE_TO_XIRR_CLASS: Partial<Record<AssetType, XIRRClass>> = {
  stock_in: "stocks",
  stock_us: "stocks",
  etf: "etf",
  mutual_fund: "mutual_fund_equity",
  mutual_fund_debt: "mutual_fund_debt",
  crypto: "crypto",
  bond: "bonds",
};

/**
 * Flat shapes, not the full Holding/Transaction domain types — this is
 * built specifically to be trimmed down before being sent to the client
 * component that recomputes this on each checkbox toggle (see
 * xirr-selector-card.tsx), so only the fields actually needed cross the
 * server/client boundary, not full Asset/Transaction objects.
 */
export interface XIRRAssetInput {
  assetId: string;
  assetType: AssetType;
  currentValue: number;
}

export interface XIRRTransactionInput {
  assetId: string;
  transactionDate: string;
  transactionType: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  taxes: number;
}

/**
 * Pools cash flows from only the SELECTED classes, same pooling approach
 * as the page's main pooled XIRR (all cash flows + current value as a
 * final "as if sold today" inflow). `npsCashflows` is included wholesale
 * when "nps" is selected — it's already a single pre-pooled series across
 * every NPS scheme (see npsService.getCashflows()), not filtered further.
 *
 * Callers should NOT use this for the all-selected (default) state — use
 * the page's already-computed, unfiltered XIRR result directly instead,
 * so the default experience is byte-for-byte identical to before this
 * feature existed, not a recomputation that HAPPENS to match. This
 * function is only for when the user has actually narrowed the selection.
 */
export function calculateFilteredXIRR(
  selected: ReadonlySet<XIRRClass>,
  holdings: XIRRAssetInput[],
  transactions: XIRRTransactionInput[],
  npsCashflows: Cashflow[],
  today: string
): CalcResult<number> {
  const selectedAssetIds = new Set(
    holdings.filter((h) => {
      const cls = ASSET_TYPE_TO_XIRR_CLASS[h.assetType];
      return cls !== undefined && selected.has(cls);
    }).map((h) => h.assetId)
  );

  const cashflows: Cashflow[] = transactions
    .filter((t) => selectedAssetIds.has(t.assetId))
    .map((t) => ({ date: t.transactionDate, amount: netCashFlow(t) }));

  const currentValue = holdings.filter((h) => selectedAssetIds.has(h.assetId)).reduce((sum, h) => sum + h.currentValue, 0);
  if (cashflows.length > 0 || currentValue > 0) cashflows.push({ date: today, amount: currentValue });

  const allCashflows = selected.has("nps") ? [...cashflows, ...npsCashflows] : cashflows;
  return calculateXIRR(allCashflows);
}
