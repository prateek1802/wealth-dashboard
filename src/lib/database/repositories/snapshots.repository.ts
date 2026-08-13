import { getServerSupabaseClient, isDemoMode } from "@/lib/database/client";
import { demoSnapshots, nextId } from "@/lib/database/demo-data";
import type { PortfolioSnapshot } from "@/types/domain/snapshot";
import type { PortfolioSnapshotRow } from "@/types/database";
import type { AllocationCategory } from "@/constants/asset-types";

function rowToSnapshot(row: PortfolioSnapshotRow): PortfolioSnapshot {
  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    netWorth: row.net_worth,
    investedCapital: row.invested_capital,
    securitiesValue: row.securities_value,
    realizedPnl: row.realized_pnl,
    unrealizedPnl: row.unrealized_pnl,
    fdValue: row.fd_value,
    npsValue: row.nps_value,
    ppfValue: row.ppf_value,
    cashValue: row.cash_value,
    allocationSnapshot: row.allocation_snapshot as Record<AllocationCategory, number>,
    createdAt: row.created_at,
  };
}

export const snapshotsRepository = {
  async findAll(): Promise<PortfolioSnapshot[]> {
    if (isDemoMode()) return [...demoSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    const db = getServerSupabaseClient();
    const { data, error } = await db.from("portfolio_snapshots").select("*").order("snapshot_date");
    if (error) throw error;
    return (data as PortfolioSnapshotRow[]).map(rowToSnapshot);
  },

  /** Upsert-by-date: at most one snapshot per calendar date (see ARCHITECTURE.md). */
  async upsertToday(snapshot: Omit<PortfolioSnapshot, "id" | "createdAt">): Promise<PortfolioSnapshot> {
    if (isDemoMode()) {
      const existingIdx = demoSnapshots.findIndex((s) => s.snapshotDate === snapshot.snapshotDate);
      const record: PortfolioSnapshot = { ...snapshot, id: existingIdx >= 0 ? demoSnapshots[existingIdx].id : nextId("snap"), createdAt: new Date().toISOString() };
      if (existingIdx >= 0) demoSnapshots[existingIdx] = record;
      else demoSnapshots.push(record);
      return record;
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db
      .from("portfolio_snapshots")
      .upsert(
        {
          snapshot_date: snapshot.snapshotDate,
          net_worth: snapshot.netWorth,
          invested_capital: snapshot.investedCapital,
          securities_value: snapshot.securitiesValue,
          realized_pnl: snapshot.realizedPnl,
          unrealized_pnl: snapshot.unrealizedPnl,
          fd_value: snapshot.fdValue,
          nps_value: snapshot.npsValue,
          ppf_value: snapshot.ppfValue,
          cash_value: snapshot.cashValue,
          allocation_snapshot: snapshot.allocationSnapshot,
        },
        { onConflict: "snapshot_date" }
      )
      .select()
      .single();
    if (error) throw error;
    return rowToSnapshot(data as PortfolioSnapshotRow);
  },
};
