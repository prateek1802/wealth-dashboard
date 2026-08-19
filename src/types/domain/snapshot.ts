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
}

export interface ActivityItem {
  id: string;
  kind: "transaction" | "nps_contribution";
  label: string;
  detail: string;
  amount: number;
  date: string;
}
