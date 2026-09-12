import type { AllocationCategory } from "@/constants/asset-types";

/** Unified net-worth snapshot — securities + FD + NPS + PPF + cash. At most one per calendar date. */
export interface PortfolioSnapshot {
  id: string;
  snapshotDate: string;
  netWorth: number;
  investedCapital: number; // securities + crypto cost basis ONLY (see ARCHITECTURE.md trade-off #1)
  securitiesValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  fdValue: number;
  npsValue: number;
  ppfValue: number;
  cashValue: number;
  allocationSnapshot: Record<AllocationCategory, number>;
  createdAt: string;
}

export interface PortfolioSummary {
  netWorth: number;
  investedCapital: number;
  currentValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  cashValue: number;
  fdValue: number;
  npsValue: number;
  ppfValue: number;
  liabilitiesValue: number;
  dayChange: number | null;
  dayChangePercent: number | null;
}

export interface AllocationSlice {
  category: AllocationCategory;
  value: number;
  percentage: number;
}

export interface PerformancePoint {
  date: string;
  value: number;
  /** True when this point was reconstructed from real historical prices (see reconstructHistoricalNetWorth); false when it had to fall back to the nearest portfolio_snapshots value; omitted for the older, purely snapshot-derived series (NetWorthCard's sparkline) — omitted is treated the same as true by the chart, since those points were never mixed with anything less reliable than what they always were. */
  isExact?: boolean;
}

export interface ActivityItem {
  id: string;
  kind: "transaction" | "nps_contribution";
  label: string;
  detail: string;
  amount: number;
  date: string;
}
