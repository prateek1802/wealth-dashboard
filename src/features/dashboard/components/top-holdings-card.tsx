import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { Holding } from "@/types/domain/holding";

export function TopHoldingsCard({ holdings }: { holdings: Holding[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {holdings.length === 0 ? (
          <EmptyState icon={Wallet} title="No holdings yet" description="Your top positions will appear here." />
        ) : (
          <ul className="flex flex-col gap-3">
            {holdings.map((h) => {
              const isGain = h.unrealizedPnl >= 0;
              return (
                <li key={h.asset.id}>
                  <Link href={ROUTES.investmentDetail(h.asset.id)} className="flex items-center justify-between gap-3 text-sm hover:opacity-80">
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-ink">{h.asset.symbol}</span>
                      <span className="text-xs text-ink-muted">{h.allocationPercent.toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-tabular text-ink">{formatCurrency(h.currentValue)}</span>
                      <span className={cn("text-xs font-tabular", isGain ? "text-gain" : "text-loss")}>
                        {formatPercent(h.unrealizedPnlPercent)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
