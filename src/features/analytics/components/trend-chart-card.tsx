"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PerformanceLineChart } from "@/components/charts/performance-line-chart";
import { calculateTrendSummary } from "@/lib/calculations/trend-summary";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { LineChart } from "lucide-react";
import type { PerformancePoint } from "@/types/domain/snapshot";

const TREND_PERIODS = ["1M", "3M", "1Y", "All"] as const;
type TrendPeriod = (typeof TREND_PERIODS)[number];

const PERIOD_SUMMARY_LABEL: Record<TrendPeriod, string> = {
  "1M": "over the last month",
  "3M": "over the last 3 months",
  "1Y": "over the last year",
  All: "since you started tracking",
};

/**
 * New — didn't exist on Analytics before. All 4 periods are fetched
 * server-side up front (analytics/page.tsx, one Promise.all) and passed in
 * here already-computed; switching the toggle only changes which
 * pre-fetched series is displayed, no client round-trip per click —
 * consistent with how the rest of this app avoids client-side fetching.
 *
 * Deliberately does NOT duplicate the Dashboard's NetWorthCard sparkline —
 * this is the larger, period-toggleable historical view; that one stays a
 * fixed 3-month glance.
 */
export function TrendChartCard({ performanceByPeriod }: { performanceByPeriod: Record<TrendPeriod, PerformancePoint[]> }) {
  const [period, setPeriod] = useState<TrendPeriod>("3M");
  const points = performanceByPeriod[period];
  const summary = calculateTrendSummary(points);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Net Worth Trend</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as TrendPeriod)}>
          <TabsList>
            {TREND_PERIODS.map((p) => (
              <TabsTrigger key={p} value={p}>
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {summary && (
          <p className={cn("text-sm font-medium", summary.isUp ? "text-gain" : "text-loss")}>
            {summary.isUp ? "Up" : "Down"} {formatCurrency(Math.abs(summary.changeAmount))}
            {summary.changePercent !== null && ` (${formatPercent(summary.changePercent)})`} {PERIOD_SUMMARY_LABEL[period]}
          </p>
        )}
        {points.length < 2 ? (
          <EmptyState icon={LineChart} title="Not enough history yet" description="This chart fills in as more daily snapshots accumulate." />
        ) : (
          <div className="h-72 w-full">
            <PerformanceLineChart points={points} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
