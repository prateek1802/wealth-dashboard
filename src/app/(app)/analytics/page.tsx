import { TopBar } from "@/components/layout/top-bar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { portfolioService } from "@/lib/services/portfolio.service";
import { npsService } from "@/lib/services/nps.service";
import { npsRepository } from "@/lib/database/repositories/nps.repository";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { snapshotsRepository } from "@/lib/database/repositories/snapshots.repository";
import { calculateCAGR, calculateXIRR } from "@/lib/calculations/returns";
import { calculateCategoryXIRR } from "@/lib/calculations/category-xirr";
import { calculateVolatility, calculateMaxDrawdown, calculateSharpeRatio, calculateSortinoRatio } from "@/lib/calculations/risk";
import { RISK_METRICS_CUTOFF_DATE } from "@/constants/risk";
import { netCashFlow } from "@/lib/calculations/cashflow";
import { formatSignedCurrency } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/date";
import { GrowthProjection } from "@/features/analytics/components/growth-projection";
import { TrendChartCard } from "@/features/analytics/components/trend-chart-card";
import { RiskMetricsSection } from "@/features/analytics/components/risk-metrics-section";
import { XIRRSelectorCard } from "@/features/analytics/components/xirr-selector-card";
import { PieChart } from "lucide-react";

export const dynamic = "force-dynamic";

const RISK_FREE_RATE = 7; // annual %, assumption used for Sharpe/Sortino

export default async function AnalyticsPage() {
  const [summary, allocation, transactions, snapshots, holdingsWithXirr, npsCashflows, npsSchemeHoldings, npsSchemeTransactions, perf1M, perf3M, perf1Y, perfAll] = await Promise.all([
    portfolioService.getPortfolioSummary(),
    portfolioService.getAssetAllocation(),
    transactionsRepository.findAll(),
    snapshotsRepository.findAll(),
    portfolioService.getHoldingsWithXIRR(),
    npsService.getCashflows(),
    npsRepository.findAllSchemeHoldings(),
    npsRepository.findAllSchemeTransactions(),
    // All 4 trend-chart periods fetched up front — the period toggle
    // (TrendChartCard) just switches which already-fetched series is
    // shown, no client round-trip per click.
    portfolioService.getPortfolioPerformance("1M"),
    portfolioService.getPortfolioPerformance("3M"),
    portfolioService.getPortfolioPerformance("1Y"),
    portfolioService.getPortfolioPerformance("All"),
  ]);

  const securitiesCashflows = transactions.map((t) => ({ date: t.transactionDate, amount: netCashFlow(t) }));
  if (securitiesCashflows.length > 0) securitiesCashflows.push({ date: todayISO(), amount: summary.currentValue });
  // Pooled with NPS the same way the Dashboard's XIRR card is (see
  // npsService.getCashflows()) — this was previously securities-only here,
  // silently disagreeing with the Dashboard under the same "XIRR" label.
  const xirr = calculateXIRR([...securitiesCashflows, ...npsCashflows]);

  // Per-asset-TYPE (not the coarser Equity/Debt/Crypto/Other grouping) plus
  // one row per NPS scheme (E/C/G/A) — see calculateCategoryXIRR's doc
  // comment for exact scope (currently-held holdings only, NPS switches
  // excluded, no FD/PPF/cash).
  const categoryXirr = calculateCategoryXIRR(holdingsWithXirr, transactions, npsSchemeHoldings, npsSchemeTransactions, todayISO());

  // Trimmed to only what calculateFilteredXIRR needs — not full Asset/
  // Transaction objects — since these get sent to a Client Component
  // (XIRRSelectorCard) for on-toggle recomputation with no server
  // round-trip. See that function's doc comment in calculations/filtered-xirr.ts.
  const xirrHoldingsInput = holdingsWithXirr.map((h) => ({ assetId: h.asset.id, assetType: h.asset.assetType, currentValue: h.currentValue }));
  const xirrTransactionsInput = transactions.map((t) => ({
    assetId: t.assetId,
    transactionDate: t.transactionDate,
    transactionType: t.transactionType,
    quantity: t.quantity,
    price: t.price,
    fees: t.fees,
    taxes: t.taxes,
  }));

  const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const netWorthSeries = sortedSnapshots.map((s) => s.netWorth);
  const snapshotDates = sortedSnapshots.map((s) => s.snapshotDate);
  const firstSnapshot = sortedSnapshots[0];
  // eslint-disable-next-line react-hooks/purity -- Server Component computing "years since first snapshot" for this request; Date.now() here is standard server-side date math, not a client render-purity concern.
  const asOf = Date.now();
  const years = firstSnapshot
    ? (asOf - new Date(firstSnapshot.snapshotDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
    : 0;
  const cagr = firstSnapshot ? calculateCAGR(firstSnapshot.netWorth, summary.netWorth, years) : { status: "insufficient_data" as const, reason: "Need at least one prior snapshot to compute CAGR." };

  const volatility = calculateVolatility(netWorthSeries, snapshotDates, RISK_METRICS_CUTOFF_DATE);
  const maxDrawdown = calculateMaxDrawdown(netWorthSeries);
  const sharpe = calculateSharpeRatio(netWorthSeries, snapshotDates, RISK_FREE_RATE, RISK_METRICS_CUTOFF_DATE);
  const sortino = calculateSortinoRatio(netWorthSeries, snapshotDates, RISK_FREE_RATE, RISK_METRICS_CUTOFF_DATE);

  return (
    <div>
      <TopBar title="Analytics" subtitle="Returns, risk, and portfolio composition" />
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <Card>
          <CardHeader><CardTitle>Returns</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="CAGR" result={cagr} caption={cagr.status === "ok" ? "Vs. oldest snapshot · pre-rewrite snapshots may not be directly comparable" : undefined} />
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

        {categoryXirr.length > 0 && (
          <Card>
            <CardHeader><CardTitle>XIRR by Asset Type</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {categoryXirr.map(({ key, label, result, count }) => (
                <StatTile
                  key={key}
                  label={label}
                  result={result}
                  colorByValue
                  caption={`${count} holding${count === 1 ? "" : "s"}`}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <TrendChartCard performanceByPeriod={{ "1M": perf1M, "3M": perf3M, "1Y": perf1Y, All: perfAll }} />

        <RiskMetricsSection volatility={volatility} maxDrawdown={maxDrawdown} sharpe={sharpe} sortino={sortino} />

        <XIRRSelectorCard defaultResult={xirr} holdings={xirrHoldingsInput} transactions={xirrTransactionsInput} npsCashflows={npsCashflows} today={todayISO()} />

        <GrowthProjection holdings={holdingsWithXirr} portfolioXirr={xirr} portfolioValue={summary.currentValue} />

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
      </div>
    </div>
  );
}
