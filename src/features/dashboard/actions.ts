"use server";
import { portfolioService } from "@/lib/services/portfolio.service";
import { snapshotService } from "@/lib/services/snapshot.service";
import type { ChartPeriod } from "@/constants/chart-periods";

export async function getPerformanceAction(period: ChartPeriod) {
  const result = await portfolioService.getReconstructedPerformance([period]);
  return result[period];
}

/** Fire-and-forget snapshot write — see ARCHITECTURE.md trade-off #2 (no cron in V1). */
export async function recordSnapshotAction() {
  try {
    await snapshotService.recordTodaysSnapshot();
  } catch {
    // Snapshot failures should never block the dashboard from rendering.
  }
}
