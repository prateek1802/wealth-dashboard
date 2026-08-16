"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { projectFutureValue } from "@/lib/calculations/returns";
import { cn } from "@/lib/utils/cn";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";
import { TrendingUp } from "lucide-react";
import type { CalcResult } from "@/lib/calculations/returns";
import type { HoldingWithXIRR } from "@/lib/services/portfolio.service";

const HORIZONS = [1, 3, 5, 10] as const;

/**
 * Extrapolates each holding's own historical XIRR, and the whole
 * portfolio's consolidated XIRR, forward at a few time horizons. This is
 * explicitly a projection assuming a past rate continues unchanged — never
 * a prediction or guarantee (see FINANCIAL SAFETY in ARCHITECTURE.md).
 * Every number here is labeled as an estimate; holdings with insufficient
 * history to compute an XIRR show the reason instead of a guessed number.
 */
export function GrowthProjection({
  holdings,
  portfolioXirr,
  portfolioValue,
}: {
  holdings: HoldingWithXIRR[];
  portfolioXirr: CalcResult<number>;
  portfolioValue: number;
}) {
  const [horizon, setHorizon] = useState<number>(5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Growth Projection</CardTitle>
          <p className="mt-1 text-xs text-ink-muted">
            Estimates assuming each historical XIRR continues unchanged — not a prediction or guarantee.
          </p>
        </div>
        <Tabs value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
          <TabsList>
            {HORIZONS.map((y) => (
              <TabsTrigger key={y} value={String(y)}>{y}Y</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Consolidated portfolio */}
        <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-border-subtle bg-surface-sunken p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-ink">Whole Portfolio</p>
              <p className="text-xs text-ink-muted">
                {portfolioXirr.status === "ok" ? `at ${formatPercent(portfolioXirr.value)} XIRR` : portfolioXirr.reason}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-tabular text-lg font-medium text-ink">
              {portfolioXirr.status === "ok" ? formatCurrency(projectFutureValue(portfolioValue, portfolioXirr.value, horizon)) : "—"}
            </p>
            <p className="text-xs text-ink-muted">in {horizon} year{horizon === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Per-holding breakdown */}
        {holdings.length === 0 ? (
          <p className="text-sm text-ink-muted">Add holdings to see a per-asset breakdown here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle text-left text-xs font-medium text-ink-muted">
                <tr>
                  <th className="py-2 pr-4">Asset</th>
                  <th className="py-2 pr-4 text-right">Current Value</th>
                  <th className="py-2 pr-4 text-right">XIRR</th>
                  <th className="py-2 text-right">Projected ({horizon}Y)</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  // A short holding period can produce a very large annualized
                  // XIRR (e.g. +335% from a few weeks of gains) that's
                  // mathematically correct but wildly misleading if compounded
                  // forward for years — a brief spike isn't a multi-year trend.
                  // Below 1 year, show the honest XIRR but withhold the
                  // long-horizon projection rather than extrapolate it.
                  const tooShortToProject = h.holdingPeriodDays < 365;
                  return (
                    <tr key={h.asset.id} className="border-b border-border-subtle last:border-0">
                      <td className="py-2 pr-4">
                        <span className={cn("font-medium text-ink", h.asset.assetType !== "mutual_fund" && h.asset.assetType !== "mutual_fund_debt" && "font-mono")}>{getAssetDisplayLabel(h.asset).primary}</span>
                      </td>
                      <td className="py-2 pr-4 text-right font-tabular text-ink">{formatCurrency(h.currentValue, h.asset.currency)}</td>
                      <td className={cn("py-2 pr-4 text-right font-tabular", h.xirr.status === "ok" && h.xirr.value >= 0 ? "text-gain" : h.xirr.status === "ok" ? "text-loss" : "text-ink-muted")}>
                        {h.xirr.status === "ok" ? formatPercent(h.xirr.value) : "insufficient data"}
                      </td>
                      <td className="py-2 text-right font-tabular text-ink">
                        {h.xirr.status === "ok" && !tooShortToProject
                          ? formatCurrency(projectFutureValue(h.currentValue, h.xirr.value, horizon), h.asset.currency)
                          : h.xirr.status === "ok"
                            ? <span className="text-xs text-ink-muted">held &lt;1yr — too soon to project</span>
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
