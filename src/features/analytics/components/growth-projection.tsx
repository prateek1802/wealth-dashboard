"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/inputs";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { projectFutureValue, projectFutureValueWithSIP } from "@/lib/calculations/returns";
import { cn } from "@/lib/utils/cn";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";
import { addActiveSipAction, stopActiveSipAction } from "@/features/active-sips/actions";
import { TrendingUp, Plus, X } from "lucide-react";
import type { CalcResult } from "@/lib/calculations/returns";
import type { HoldingWithXIRR } from "@/lib/services/portfolio.service";
import type { ActiveSIP } from "@/types/domain/active-sip";

const HORIZONS = [1, 3, 5, 10] as const;

/**
 * Extrapolates each holding's own historical XIRR, and the whole
 * portfolio's consolidated XIRR, forward at a few time horizons. This is
 * explicitly a projection assuming a past rate continues unchanged — never
 * a prediction or guarantee (see FINANCIAL SAFETY in ARCHITECTURE.md).
 * Every number here is labeled as an estimate; holdings with insufficient
 * history to compute an XIRR show the reason instead of a guessed number.
 *
 * Holdings with an Active SIP (see active_sips in schema.sql) project with
 * projectFutureValueWithSIP() instead — compounding the ongoing monthly
 * contribution forward alongside the current value — rather than assuming
 * every holding sits untouched as a lump sum.
 */
export function GrowthProjection({
  holdings,
  portfolioXirr,
  portfolioValue,
  activeSips,
}: {
  holdings: HoldingWithXIRR[];
  portfolioXirr: CalcResult<number>;
  portfolioValue: number;
  activeSips: ActiveSIP[];
}) {
  const [horizon, setHorizon] = useState<number>(5);
  const [isPending, startTransition] = useTransition();
  const [addingAssetId, setAddingAssetId] = useState("");
  const [addingAmount, setAddingAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeOnly = activeSips.filter((s) => s.status === "active");
  const sipByAsset = new Map(activeOnly.map((s) => [s.assetId, s.monthlyAmount]));
  const totalMonthlySip = activeOnly.reduce((sum, s) => sum + s.monthlyAmount, 0);
  // Holdings not already running a SIP — the only ones offered in "Add SIP",
  // since active_sips enforces one active SIP per asset (see schema.sql).
  const eligibleForNewSip = holdings.filter((h) => !sipByAsset.has(h.asset.id));

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addActiveSipAction({ assetId: addingAssetId, monthlyAmount: Number(addingAmount) });
      if (result.ok) {
        toast.success("SIP added");
        setAddingAssetId("");
        setAddingAmount("");
      } else {
        setError(result.error);
      }
    });
  }

  function handleStop(sip: ActiveSIP) {
    startTransition(async () => {
      const result = await stopActiveSipAction(sip.id);
      if (result.ok) toast.success("SIP stopped");
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Growth Projection</CardTitle>
          <p className="mt-1 text-xs text-ink-muted">
            Estimates assuming each historical XIRR continues unchanged — not a prediction or guarantee.
            {totalMonthlySip > 0 && ` Includes ${formatCurrency(totalMonthlySip)}/mo across ${activeOnly.length} active SIP${activeOnly.length === 1 ? "" : "s"}.`}
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
              {portfolioXirr.status === "ok"
                ? formatCurrency(
                    totalMonthlySip > 0
                      ? projectFutureValueWithSIP(portfolioValue, portfolioXirr.value, horizon, totalMonthlySip)
                      : projectFutureValue(portfolioValue, portfolioXirr.value, horizon)
                  )
                : "—"}
            </p>
            <p className="text-xs text-ink-muted">in {horizon} year{horizon === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Per-holding breakdown */}
        {holdings.length === 0 ? (
          <p className="text-sm text-ink-muted">Add holdings to see a per-asset breakdown here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
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
                  const sipAmount = sipByAsset.get(h.asset.id);
                  return (
                    <tr key={h.asset.id} className="border-b border-border-subtle last:border-0">
                      <td className="py-2 pr-4">
                        <span className={cn("font-medium text-ink", h.asset.assetType !== "mutual_fund" && h.asset.assetType !== "mutual_fund_debt" && "font-mono")}>{getAssetDisplayLabel(h.asset).primary}</span>
                        {sipAmount !== undefined && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">SIP {formatCurrency(sipAmount)}/mo</span>}
                      </td>
                      <td className="py-2 pr-4 text-right font-tabular text-ink">{formatCurrency(h.currentValue, h.asset.currency)}</td>
                      <td className={cn("py-2 pr-4 text-right font-tabular", h.xirr.status === "ok" && h.xirr.value >= 0 ? "text-gain" : h.xirr.status === "ok" ? "text-loss" : "text-ink-muted")}>
                        {h.xirr.status === "ok" ? formatPercent(h.xirr.value) : "insufficient data"}
                      </td>
                      <td className="py-2 text-right font-tabular text-ink">
                        {h.xirr.status === "ok" && !tooShortToProject
                          ? formatCurrency(
                              sipAmount !== undefined
                                ? projectFutureValueWithSIP(h.currentValue, h.xirr.value, horizon, sipAmount)
                                : projectFutureValue(h.currentValue, h.xirr.value, horizon),
                              h.asset.currency
                            )
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

        {/* Active SIPs — compact management, no dedicated page. One active SIP per asset (schema-enforced); stop + re-add for a changed amount rather than an in-place edit. */}
        <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-border-subtle p-3">
          <p className="text-xs font-medium text-ink-muted">Active SIPs</p>
          {activeOnly.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {activeOnly.map((s) => {
                const asset = holdings.find((h) => h.asset.id === s.assetId)?.asset;
                return (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{asset ? getAssetDisplayLabel(asset).primary : s.assetId} — {formatCurrency(s.monthlyAmount)}/mo</span>
                    <button type="button" onClick={() => handleStop(s)} disabled={isPending} className="text-xs text-ink-muted hover:text-loss" aria-label="Stop SIP">
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {eligibleForNewSip.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Select value={addingAssetId} onValueChange={setAddingAssetId}>
                <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Choose a holding" /></SelectTrigger>
                <SelectContent>
                  {eligibleForNewSip.map((h) => (
                    <SelectItem key={h.asset.id} value={h.asset.id}>{getAssetDisplayLabel(h.asset).primary}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CurrencyInput className="h-9 w-32" placeholder="₹/month" value={addingAmount} onChange={(e) => setAddingAmount(e.target.value)} />
              <Button size="sm" variant="outline" disabled={isPending || !addingAssetId || !addingAmount} onClick={handleAdd}>
                <Plus className="size-3.5" /> Add SIP
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-loss">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
