import { snapshotsRepository } from "@/lib/database/repositories/snapshots.repository";
import { portfolioService } from "./portfolio.service";
import { todayISO } from "@/lib/utils/date";

/**
 * Writes today's unified net-worth snapshot by calling the SAME aggregation
 * service the dashboard reads from — this is what guarantees
 * portfolio_snapshots can never drift from what's shown live (point 3).
 * Called opportunistically whenever the dashboard is viewed (V1 has no
 * cron/scheduler — see ARCHITECTURE.md trade-off #2).
 */
export const snapshotService = {
  async recordTodaysSnapshot() {
    const [summary, allocation] = await Promise.all([
      portfolioService.getPortfolioSummary(),
      portfolioService.getAssetAllocation(),
    ]);

    const allocationSnapshot = Object.fromEntries(allocation.map((a) => [a.category, a.value])) as Record<string, number>;

    return snapshotsRepository.upsertToday({
      snapshotDate: todayISO(),
      netWorth: summary.netWorth,
      investedCapital: summary.investedCapital,
      securitiesValue: summary.currentValue,
      realizedPnl: summary.realizedPnl,
      unrealizedPnl: summary.unrealizedPnl,
      fdValue: summary.fdValue,
      npsValue: summary.npsValue,
      ppfValue: summary.ppfValue,
      cashValue: summary.cashValue,
      allocationSnapshot: allocationSnapshot as never,
    });
  },
};
