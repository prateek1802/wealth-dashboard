import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPercent } from "@/lib/utils/currency";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  deltaPercent?: number | null;
  deltaLabel?: string;
  sparkline?: ReactNode;
  hero?: boolean;
  className?: string;
}

export function MetricCard({ label, value, deltaPercent, deltaLabel, sparkline, hero, className }: MetricCardProps) {
  const isPositive = (deltaPercent ?? 0) >= 0;
  return (
    <Card className={cn("flex h-full flex-col justify-between gap-4 p-6", className)}>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        <span className={cn("font-display font-tabular text-ink", hero ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl")}>
          {value}
        </span>
        {deltaPercent !== undefined && deltaPercent !== null && (
          <div
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isPositive ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
            )}
          >
            {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatPercent(deltaPercent)}
            {deltaLabel && <span className="text-ink-muted">{deltaLabel}</span>}
          </div>
        )}
      </div>
      {sparkline && <div className="h-16 w-full">{sparkline}</div>}
    </Card>
  );
}
