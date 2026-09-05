"use client";
import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { StatTile } from "./stat-tile";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";
import type { CalcResult } from "@/lib/calculations/returns";

/** Verbatim from the redesign spec. */
const EXPLAINERS = {
  volatility: "How much your portfolio's value has swung, annualized.",
  maxDrawdown: "The largest drop from a peak to a subsequent low.",
  sharpe: "Return earned per unit of risk taken — above 1 is generally considered good, above 2 is very good.",
  sortino: "Like Sharpe, but only penalizes downside volatility, not upside swings.",
};

/**
 * Moved here from the always-visible page (Volatility/Sharpe/Sortino/Max
 * Drawdown), collapsed by default — these are the metrics that eroded
 * trust in the whole page while the outlier bug was still live (fixed
 * separately, see calculations/risk.ts). Now that they're plausible again,
 * they're still secondary/advanced compared to XIRR, CAGR, and the trend
 * chart, so they stay tucked away rather than dominating the page.
 *
 * The existing "Annualized from irregular snapshots · approximate"
 * captions are kept as-is per the redesign spec (still accurate, still
 * worth keeping visible even collapsed) — the plain-language explainer
 * below each tile is additive, not a replacement for that caption.
 */
export function RiskMetricsSection({
  volatility,
  maxDrawdown,
  sharpe,
  sortino,
}: {
  volatility: CalcResult<number>;
  maxDrawdown: CalcResult<number>;
  sharpe: CalcResult<number>;
  sortino: CalcResult<number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-5 text-left">
          <CardTitle>Advanced / Risk Metrics</CardTitle>
          <ChevronDown className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 gap-4 border-t border-border-subtle p-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <StatTile label="Volatility" result={volatility} caption="Annualized from irregular snapshots · approximate" />
              <p className="text-xs text-ink-muted">{EXPLAINERS.volatility}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <StatTile label="Max Drawdown" result={maxDrawdown} />
              <p className="text-xs text-ink-muted">{EXPLAINERS.maxDrawdown}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <StatTile label="Sharpe Ratio" result={sharpe} format={(v) => v.toFixed(2)} colorByValue caption="Annualized from irregular snapshots · approximate" />
              <p className="text-xs text-ink-muted">{EXPLAINERS.sharpe}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <StatTile label="Sortino Ratio" result={sortino} format={(v) => v.toFixed(2)} colorByValue caption="Annualized from irregular snapshots · approximate" />
              <p className="text-xs text-ink-muted">{EXPLAINERS.sortino}</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
