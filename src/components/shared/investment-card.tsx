"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_TYPE_LABELS } from "@/constants/asset-types";
import { formatCurrency, formatSignedCurrency, formatPercent } from "@/lib/utils/currency";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Holding } from "@/types/domain/holding";

export function InvestmentCard({ holding }: { holding: Holding }) {
  const isGain = holding.unrealizedPnl >= 0;
  return (
    <Link href={ROUTES.investmentDetail(holding.asset.id)}>
      <Card className="flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-mono text-sm font-medium text-ink">{holding.asset.symbol}</span>
            <span className="text-xs text-ink-muted">{holding.asset.name}</span>
          </div>
          <Badge>{ASSET_TYPE_LABELS[holding.asset.assetType]}</Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-tabular text-xl font-medium text-ink">{formatCurrency(holding.currentValue, holding.asset.currency)}</span>
          <span className="text-xs text-ink-muted">Invested {formatCurrency(holding.investedAmount, holding.asset.currency)}</span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isGain ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
            )}
          >
            {isGain ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatSignedCurrency(holding.unrealizedPnl, holding.asset.currency)} ({formatPercent(holding.unrealizedPnlPercent)})
          </div>
          <span className="text-xs text-ink-muted">{holding.allocationPercent.toFixed(1)}% of portfolio</span>
        </div>
      </Card>
    </Link>
  );
}
