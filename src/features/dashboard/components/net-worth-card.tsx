import { MetricCard } from "@/components/shared/metric-card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatCurrency } from "@/lib/utils/currency";
import type { PortfolioSummary, PerformancePoint } from "@/types/domain/snapshot";

export function NetWorthCard({ summary, recentPoints }: { summary: PortfolioSummary; recentPoints: PerformancePoint[] }) {
  const values = recentPoints.map((p) => p.value);
  const positive = (summary.dayChangePercent ?? 0) >= 0;

  return (
    <MetricCard
      label="Net Worth"
      value={formatCurrency(summary.netWorth)}
      deltaPercent={summary.dayChangePercent}
      deltaLabel="since last snapshot"
      hero
      sparkline={values.length > 1 ? <Sparkline values={values} positive={positive} /> : undefined}
    />
  );
}
