import { TopBar } from "@/components/layout/top-bar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { portfolioService } from "@/lib/services/portfolio.service";
import { npsService } from "@/lib/services/nps.service";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { snapshotsRepository } from "@/lib/database/repositories/snapshots.repository";
import { calculateCAGR, calculateXIRR } from "@/lib/calculations/returns";
import { calculateVolatility, calculateMaxDrawdown, calculateSharpeRatio, calculateSortinoRatio } from "@/lib/calculations/risk";
import { netCashFlow } from "@/lib/calculations/cashflow";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/date";
import { ALLOCATION_CATEGORY_LABELS } from "@/constants/asset-types";
import { GrowthProjection } from "@/features/analytics/components/growth-projection";
import { PieChart } from "lucide-react";

export const dynamic = "force-dynamic";

const RISK_FREE_RATE = 7; // annual %, assumption used for Sharpe/Sortino

export default async function AnalyticsPage() {
  const [summary, allocation, transactions, snapshots, holdingsWithXirr, npsCashflows] = await Promise.all([
    portfolioService.getPortfolioSummary(),
    portfolioService.getAssetAllocation(),
    transactionsRepository.findAll(),
    snapshotsRepository.findAll(),
    portfolioService.getHoldingsWithXIRR(),
    npsService.getCashflows(),
  ]);

  const securitiesCashflows = transactions.map((t) => ({ date: t.transactionDate, amount: netCashFlow(t) }));
  if (securitiesCashflows.length > 0) securitiesCashflows.push({ date: todayISO(), amount: summary.currentValue });
  // Pooled with NPS the same way the Dashboard's XIRR card is (see
  // npsService.getCashflows()) — this was previously securities-only here,
  // silently disagreeing with the Dashboard under the same "XIRR" label.
  const xirr = calculateXIRR([...securitiesCashflows, ...npsCashflows]);

  const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const netWorthSeries = sortedSnapshots.map((s) => s.netWorth);
  const firstSnapshot = sortedSnapshots[0];
  // eslint-disable-next-line react-hooks/purity -- Server Component computing "years since first snapshot" for this request; Date.now() here is standard server-side date math, not a client render-purity concern.
  const asOf = Date.now();
  const years = firstSnapshot
    ? (asOf - new Date(firstSnapshot.snapshotDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
    : 0;
  const cagr = firstSnapshot ? calculateCAGR(firstSnapshot.netWorth, summary.netWorth, years) : { status: "insufficient_data" as const, reason: "Need at least one prior snapshot to compute CAGR." };

  const volatility = calculateVolatility(netWorthSeries);
  const maxDrawdown = calculateMaxDrawdown(netWorthSeries);
  const sharpe = calculateSharpeRatio(netWorthSeries, RISK_FREE_RATE);
  const sortino = calculateSortinoRatio(netWorthSeries, RISK_FREE_RATE);

  const topHolding = allocation[0];
  const concentration = topHolding
    ? { status: "ok" as const, value: topHolding.percentage }
    : { status: "insufficient_data" as const, reason: "No holdings yet." };

  return (
    <div>
      <TopBar title="Analytics" subtitle="Returns, risk, and portfolio composition" />
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <Card>
          <CardHeader><CardTitle>Returns</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="CAGR" result={cagr} />
            <StatTile label="XIRR" result={xirr} caption="Securities + NPS · excludes FD, PPF, cash" />
            <Card className="flex flex-col gap-1.5 p-5">
              <span className="text-xs font-medium text-ink-muted">Realized P&amp;L</span>
              <span className="font-tabular text-xl font-medium text-ink">{formatSignedCurrency(summary.realizedPnl)}</span>
            </Card>
            <Card className="flex flex-col gap-1.5 p-5">
              <span className="text-xs font-medium text-ink-muted">Unrealized P&amp;L</span>
              <span className="font-tabular text-xl font-medium text-ink">{formatSignedCurrency(summary.unrealizedPnl)}</span>
            </Card>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Volatility" result={volatility} />
            <StatTile label="Max Drawdown" result={maxDrawdown} />
            <StatTile label="Sharpe Ratio" result={sharpe} format={(v) => v.toFixed(2)} colorByValue />
            <StatTile label="Sortino Ratio" result={sortino} format={(v) => v.toFixed(2)} colorByValue />
          </CardContent>
        </Card>

        <GrowthProjection holdings={holdingsWithXirr} portfolioXirr={xirr} portfolioValue={summary.currentValue} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Asset Allocation</CardTitle></CardHeader>
            <CardContent>
              {allocation.length === 0 ? (
                <EmptyState icon={PieChart} title="No holdings yet" description="Allocation breakdown appears once you add investments." />
              ) : (
                <AllocationDonut slices={allocation} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Concentration</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <StatTile
                label="Largest position, % of portfolio"
                result={concentration}
                format={(v) => `${v.toFixed(1)}%`}
              />
              {allocation.length > 0 && (
                <ul className="flex flex-col gap-2 text-sm">
                  {allocation.slice(0, 5).map((a) => (
                    <li key={a.category} className="flex justify-between text-ink-muted">
                      <span>{ALLOCATION_CATEGORY_LABELS[a.category] ?? a.category}</span>
                      <span className="font-tabular text-ink">{formatCurrency(a.value)} · {a.percentage.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
