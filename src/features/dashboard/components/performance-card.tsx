"use client";
import { useState, useTransition } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { PerformanceLineChart } from "@/components/charts/performance-line-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHART_PERIODS, type ChartPeriod } from "@/constants/chart-periods";
import { getPerformanceAction } from "../actions";
import { LineChart as LineChartIcon } from "lucide-react";
import type { PerformancePoint } from "@/types/domain/snapshot";

export function PerformanceCard({ initialPeriod, initialPoints }: { initialPeriod: ChartPeriod; initialPoints: PerformancePoint[] }) {
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const [points, setPoints] = useState(initialPoints);
  const [isPending, startTransition] = useTransition();

  function onPeriodChange(next: string) {
    const nextPeriod = next as ChartPeriod;
    setPeriod(nextPeriod);
    startTransition(async () => {
      const data = await getPerformanceAction(nextPeriod);
      setPoints(data);
    });
  }

  return (
    <ChartCard
      title="Portfolio Performance"
      action={
        <Tabs value={period} onValueChange={onPeriodChange}>
          <TabsList>
            {CHART_PERIODS.map((p) => (
              <TabsTrigger key={p} value={p}>{p}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}
    >
      {points.length < 2 ? (
        <EmptyState
          icon={LineChartIcon}
          title="Not enough history yet"
          description="Net-worth snapshots build up over time as you use the app — check back after a few days."
        />
      ) : (
        <div className="h-64 w-full">
          <PerformanceLineChart points={points} />
        </div>
      )}
    </ChartCard>
  );
}
