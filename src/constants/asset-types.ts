export const ASSET_TYPES = [
  "stock_in",
  "stock_us",
  "etf",
  "mutual_fund",       // equity-oriented mutual funds (existing V1 default)
  "mutual_fund_debt",  // debt mutual funds — kept distinct so allocation can split Equity vs Debt
  "bond",              // direct bonds / debentures — also a Debt bucket
  "crypto",
  "cash",
  "other",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock_in: "Indian Stock",
  stock_us: "US Stock",
  etf: "ETF",
  mutual_fund: "Equity MF",
  mutual_fund_debt: "Debt MF",
  bond: "Bond",
  crypto: "Crypto",
  cash: "Cash",
  other: "Other",
};

/**
 * Asset types selectable when adding a security or watchlist item. Excludes
 * "cash" — cash is tracked via the dedicated Bank Accounts feature now
 * (bank_accounts table), not as a security with quantity/price. "cash"
 * remains a valid AssetType/allocation category for backward compatibility
 * with any pre-existing data, just not offered in these dropdowns.
 */
export const SECURITY_ASSET_TYPES = ASSET_TYPES.filter((t) => t !== "cash");

/** Broader groupings for a segregated portfolio view — Equity / Debt / Cash /
 * Crypto / Other. Purely a display grouping computed from asset_type; not
 * stored anywhere, so relabeling this never needs a migration.
 */
export const ASSET_TYPE_GROUP: Record<AssetType, "Equity" | "Debt" | "Cash" | "Crypto" | "Other"> = {
  stock_in: "Equity",
  stock_us: "Equity",
  etf: "Equity",
  mutual_fund: "Equity",
  mutual_fund_debt: "Debt",
  bond: "Debt",
  crypto: "Crypto",
  cash: "Cash",
  other: "Other",
};

/** Asset classes that are NOT rows in `assets` — they have dedicated tables. */
export const NON_SECURITY_CLASSES = ["fixed_deposit", "nps", "ppf"] as const;
export type NonSecurityClass = (typeof NON_SECURITY_CLASSES)[number];

/** Full allocation category set used by getAssetAllocation() — unions securities + FD + NPS + PPF + cash. */
export type AllocationCategory = AssetType | NonSecurityClass;

export const ALLOCATION_CATEGORY_LABELS: Record<AllocationCategory, string> = {
  ...ASSET_TYPE_LABELS,
  fixed_deposit: "Fixed Deposits",
  nps: "NPS",
  ppf: "PPF",
};

export const TRANSACTION_TYPES = ["BUY", "SELL"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const FD_PAYOUT_TYPES = ["cumulative", "monthly", "quarterly", "annual"] as const;
export type FDPayoutType = (typeof FD_PAYOUT_TYPES)[number];
