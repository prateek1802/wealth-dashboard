import { TopBar } from "@/components/layout/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { portfolioService } from "@/lib/services/portfolio.service";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { Scissors, AlertTriangle } from "lucide-react";
import type { GainClassification } from "@/lib/calculations/tax-harvesting";

export const dynamic = "force-dynamic";

const CLASSIFICATION_LABELS: Record<GainClassification, string> = {
  short_term: "Short-term",
  long_term: "Long-term",
  flat_rate_vda: "Crypto (flat 30%)",
  unsupported: "Rules not modeled",
};

export default async function TaxHarvestingPage() {
  const summary = await portfolioService.getTaxHarvestingSummary();

  const offsettableLots = summary.harvestableLots.filter((l) => l.classification === "short_term" || l.classification === "long_term");
  const cryptoLots = summary.harvestableLots.filter((l) => l.classification === "flat_rate_vda");
  const unsupportedLots = summary.harvestableLots.filter((l) => l.classification === "unsupported");

  return (
    <div>
      <TopBar title="Tax Harvesting" subtitle={`Unrealized losses that could offset ${summary.financialYear.label} capital gains — Indian equity/debt/foreign-share rules`} />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card className="flex items-start gap-3 border-accent-soft bg-accent-soft/40 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
          <div className="flex flex-col gap-1 text-xs text-ink-muted">
            <p>
              <span className="font-medium text-ink">This is informational, not tax advice.</span> Holding-period math here is a day-count approximation, not
              exact to tax-authority conventions for every edge case. Nothing here is a recommendation to sell anything. Verify before filing — talk to a CA
              for anything consequential.
            </p>
            <p>
              A short-term loss can offset both short-term and long-term gains. A <span className="font-medium text-ink">long-term loss can only offset
              long-term gains</span> — it cannot reduce short-term tax. Crypto losses cannot offset anything at all (see below).
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            label={`${summary.financialYear.label} realized STCG`}
            result={{ status: "ok", value: summary.realizedSTCG }}
            format={(v) => formatSignedCurrency(v)}
            colorByValue
          />
          <StatTile
            label={`${summary.financialYear.label} realized LTCG`}
            result={{ status: "ok", value: summary.realizedLTCG }}
            format={(v) => formatSignedCurrency(v)}
            colorByValue
          />
          <StatTile label="Short-term losses available" result={{ status: "ok", value: -summary.totalShortTermLoss }} format={(v) => formatCurrency(-v)} />
          <StatTile label="Long-term losses available" result={{ status: "ok", value: -summary.totalLongTermLoss }} format={(v) => formatCurrency(-v)} />
        </div>

        <Card className="p-0">
          <div className="flex items-center gap-2 border-b border-border-subtle p-4">
            <Scissors className="size-4 text-ink-muted" />
            <span className="font-medium text-ink">Harvestable lots</span>
            <span className="text-xs text-ink-muted">({offsettableLots.length})</span>
          </div>
          {offsettableLots.length === 0 ? (
            <EmptyState
              icon={Scissors}
              title="No harvestable losses right now"
              description="Every open lot in your portfolio is currently at a gain or breakeven — nothing here to offset against realized gains."
              className="border-none"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border-subtle bg-surface-sunken text-left text-xs font-medium text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Acquired</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unrealized Loss</th>
                    <th className="px-4 py-3 text-right">Days to Long-term</th>
                  </tr>
                </thead>
                <tbody>
                  {offsettableLots.map((lot, i) => {
                    const label = getAssetDisplayLabel(lot.asset);
                    return (
                      <tr key={`${lot.assetId}-${lot.acquiredDate}-${i}`} className="border-b border-border-subtle last:border-0 hover:bg-surface-sunken">
                        <td className="px-4 py-3">
                          <Link href={ROUTES.investmentDetail(lot.assetId)} className="flex flex-col">
                            <span className="font-medium text-ink">{label.primary}</span>
                            <span className="text-xs text-ink-muted">{label.secondary}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{formatDate(lot.acquiredDate)}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn(lot.classification === "long_term" && "border-gain/30 bg-gain-soft text-gain")}>
                            {CLASSIFICATION_LABELS[lot.classification]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-tabular">{lot.quantity}</td>
                        <td className="px-4 py-3 text-right font-tabular text-loss">-{formatCurrency(lot.lossAmount, lot.asset.currency)}</td>
                        <td className="px-4 py-3 text-right font-tabular text-ink-muted">
                          {lot.daysUntilLongTerm != null ? `${lot.daysUntilLongTerm}d` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {cryptoLots.length > 0 && (
          <Card className="flex flex-col gap-3 border-loss/30 bg-loss-soft/40 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-loss" />
              <span className="font-medium text-ink">Crypto losses — not offsettable</span>
            </div>
            <p className="text-xs text-ink-muted">
              Under Section 115BBH, a Virtual Digital Asset loss cannot be set off against any other gain or income — not even against a gain on a different
              coin. These are shown for visibility only; they can&apos;t reduce tax on anything else in your portfolio.
            </p>
            <div className="flex flex-col gap-2">
              {cryptoLots.map((lot, i) => {
                const label = getAssetDisplayLabel(lot.asset);
                return (
                  <div key={`${lot.assetId}-${lot.acquiredDate}-${i}`} className="flex items-center justify-between text-xs">
                    <span className="text-ink">
                      {label.primary} <span className="text-ink-muted">· acquired {formatDate(lot.acquiredDate)}</span>
                    </span>
                    <span className="font-tabular text-loss">-{formatCurrency(lot.lossAmount, lot.asset.currency)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {unsupportedLots.length > 0 && (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-ink-muted" />
              <span className="font-medium text-ink">Bonds — rules not modeled here</span>
            </div>
            <p className="text-xs text-ink-muted">
              Bond taxation varies a lot by type (zero-coupon, sovereign gold bonds, tax-free bonds, market-linked debentures all differ) — this app
              doesn&apos;t guess a rate for them. These lots are at a loss but excluded from the totals above; check with a CA for the applicable treatment.
            </p>
            <div className="flex flex-col gap-2">
              {unsupportedLots.map((lot, i) => {
                const label = getAssetDisplayLabel(lot.asset);
                return (
                  <div key={`${lot.assetId}-${lot.acquiredDate}-${i}`} className="flex items-center justify-between text-xs">
                    <span className="text-ink">
                      {label.primary} <span className="text-ink-muted">· acquired {formatDate(lot.acquiredDate)}</span>
                    </span>
                    <span className="font-tabular text-loss">-{formatCurrency(lot.lossAmount, lot.asset.currency)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
