import { Card } from "@/components/ui/card";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { PortfolioSummary } from "@/types/domain/snapshot";

export function PortfolioValueCard({ summary }: { summary: PortfolioSummary }) {
  const isGain = summary.unrealizedPnl >= 0;
  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <span className="text-sm font-medium text-ink-muted">Portfolio Value</span>
      <span className="font-display font-tabular text-2xl text-ink">{formatCurrency(summary.currentValue)}</span>
      <div className="mt-1 flex flex-col gap-1 text-xs">
        <div className="flex justify-between text-ink-muted">
          <span>Invested</span>
          <span className="font-tabular">{formatCurrency(summary.investedCapital)}</span>
        </div>
        <div className={cn("flex justify-between", isGain ? "text-gain" : "text-loss")}>
          <span>Unrealized P&amp;L</span>
          <span className="font-tabular">{formatSignedCurrency(summary.unrealizedPnl)}</span>
        </div>
        <div className="flex justify-between text-ink-muted">
          <span>Realized P&amp;L</span>
          <span className="font-tabular">{formatSignedCurrency(summary.realizedPnl)}</span>
        </div>
      </div>
    </Card>
  );
}
