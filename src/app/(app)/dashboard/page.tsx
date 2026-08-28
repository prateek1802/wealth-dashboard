import { TopBar } from "@/components/layout/top-bar";
import { portfolioService } from "@/lib/services/portfolio.service";
import { snapshotService } from "@/lib/services/snapshot.service";
import { fdService } from "@/lib/services/fd.service";
import { npsService } from "@/lib/services/nps.service";
import { goalsRepository } from "@/lib/database/repositories/goals.repository";
import { calculateXIRR } from "@/lib/calculations/returns";
import { netCashFlow } from "@/lib/calculations/cashflow";
import { todayISO } from "@/lib/utils/date";

import { NetWorthCard } from "@/features/dashboard/components/net-worth-card";
import { XIRRCard } from "@/features/dashboard/components/xirr-card";
import { RefreshAllCard } from "@/features/dashboard/components/refresh-all-card";
import { PortfolioValueCard } from "@/features/dashboard/components/portfolio-value-card";
import { AllocationCard } from "@/features/dashboard/components/allocation-card";
import { TopHoldingsCard } from "@/features/dashboard/components/top-holdings-card";
import { PerformanceCard } from "@/features/dashboard/components/performance-card";
import { ActivityCard } from "@/components/shared/activity-card";
import { GoalsSummaryCard } from "@/features/dashboard/components/goals-summary-card";
import { FDMaturitiesCard } from "@/features/dashboard/components/fd-maturities-card";
import { BreakdownCard } from "@/features/dashboard/components/breakdown-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Opportunistic snapshot write — see ARCHITECTURE.md trade-off #2 (no cron in V1).
  await snapshotService.recordTodaysSnapshot().catch(() => {});

  // Single shared fetch — see portfolioService.getDashboardData()'s doc
  // comment. Previously this page independently called
  // getPortfolioSummary/getAssetAllocation/getTopHoldings/
  // getSegregatedBreakdown (each re-running computeHoldings() from
  // scratch) plus getRecentActivity and a direct transactions fetch here —
  // 5x assets.findAll() and 5x transactions.findAll() per page load.
  const [{ summary, allocation, topHoldings, recentActivity: activity, breakdown, performance, transactions }, goals, fds, npsCashflows] = await Promise.all([
    portfolioService.getDashboardData("3M", 6, 5),
    goalsRepository.findAll(),
    fdService.listWithProjections(),
    npsService.getCashflows(),
  ]);

  const securitiesCashflows = transactions.map((t) => ({ date: t.transactionDate, amount: netCashFlow(t) }));
  if (securitiesCashflows.length > 0) {
    securitiesCashflows.push({ date: todayISO(), amount: summary.currentValue });
  }
  // Securities + NPS pooled into one portfolio-wide XIRR. FD, PPF, and bank
  // cash aren't included yet — those don't have per-transaction cash flows
  // logged the way securities and NPS contributions do.
  const xirr = calculateXIRR([...securitiesCashflows, ...npsCashflows]);

  return (
    <div>
      <TopBar title="Dashboard" subtitle="How is your wealth doing?" />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4 lg:p-8">
        {/* Row 1 — hero + compact */}
        <div className="md:col-span-2 lg:col-span-3">
          <NetWorthCard summary={summary} recentPoints={performance} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-1">
          <XIRRCard xirr={xirr} />
          <RefreshAllCard />
        </div>

        {/* Row 2 — allocation / value / top holdings */}
        <div className="md:col-span-1 lg:col-span-2">
          <AllocationCard slices={allocation} />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <PortfolioValueCard summary={summary} />
        </div>
        <div className="md:col-span-1 lg:col-span-1 md:row-span-2">
          <TopHoldingsCard holdings={topHoldings} />
        </div>

        {/* Row 3 — full-width performance */}
        <div className="md:col-span-3 lg:col-span-3">
          <PerformanceCard initialPeriod="3M" initialPoints={performance} />
        </div>

        {/* Row 4 — activity / goals / FDs */}
        <div className="md:col-span-1 lg:col-span-2">
          <ActivityCard items={activity} />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <GoalsSummaryCard goals={goals} />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <FDMaturitiesCard fds={fds} />
        </div>

        {/* Row 5 — full-width segregated breakdown */}
        <div className="md:col-span-3 lg:col-span-4">
          <BreakdownCard breakdown={breakdown} />
        </div>
      </div>
    </div>
  );
}
