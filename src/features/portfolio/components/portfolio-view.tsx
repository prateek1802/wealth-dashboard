"use client";
import { useState, useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import { InvestmentCard } from "@/components/shared/investment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { AssetRefreshButton } from "@/components/shared/asset-refresh-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { refreshLivePricesAction } from "../actions";
import { formatCurrency, formatCurrencyPrecise, formatPercent, formatSignedCurrency } from "@/lib/utils/currency";
import { ASSET_TYPE_LABELS, type AssetType } from "@/constants/asset-types";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";
import { cn } from "@/lib/utils/cn";
import { Wallet, Plus, LayoutGrid, List, RefreshCw, ChevronDown } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { Holding } from "@/types/domain/holding";

/**
 * Groups holdings into per-asset-class sections (Stocks, Mutual Funds,
 * Crypto, ETFs, Bonds, Other) — each independently collapsible, so you can
 * fold away what you're not looking at right now. Grouping is by exact
 * asset_type, not the coarser Equity/Debt buckets used in the dashboard
 * breakdown — those answer "how is my money split," this answers "which
 * specific stocks/funds do I hold."
 */
const GROUP_ORDER: AssetType[] = ["stock_in", "stock_us", "etf", "mutual_fund", "mutual_fund_debt", "crypto", "bond", "other"];
const GROUP_LABELS: Partial<Record<AssetType, string>> = {
  stock_in: "Indian Stocks",
  stock_us: "US Stocks",
  etf: "ETFs",
  mutual_fund: "Mutual Funds (Equity)",
  mutual_fund_debt: "Mutual Funds (Debt)",
  crypto: "Crypto",
  bond: "Bonds",
  other: "Other",
};

function groupHoldings(holdings: Holding[]) {
  const groups = new Map<AssetType, Holding[]>();
  for (const h of holdings) {
    const list = groups.get(h.asset.assetType) ?? [];
    list.push(h);
    groups.set(h.asset.assetType, list);
  }
  return GROUP_ORDER.filter((t) => groups.has(t)).map((t) => ({ type: t, label: GROUP_LABELS[t] ?? ASSET_TYPE_LABELS[t], holdings: groups.get(t)! }));
}

function HoldingsGroup({ label, holdings, view, hideHeader = false }: { label: string; holdings: Holding[]; view: "cards" | "table"; hideHeader?: boolean }) {
  const [open, setOpen] = useState(true);
  const [isRefreshing, startRefresh] = useTransition();
  const total = holdings.reduce((s, h) => s + h.currentValue, 0);

  function handleGroupRefresh(e: MouseEvent) {
    e.stopPropagation(); // don't also toggle the collapse
    startRefresh(async () => {
      const result = await refreshLivePricesAction(holdings.map((h) => h.asset.id));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.updated === 0) {
        toast.info(`No live prices available for ${label || "this group"}.`);
      } else {
        toast.success(`Updated ${result.updated} price${result.updated === 1 ? "" : "s"}${result.skipped.length ? ` · ${result.skipped.length} skipped` : ""}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {!hideHeader && (
        <div className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-1 py-1">
          <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
            <ChevronDown className={cn("size-4 text-ink-muted transition-transform", !open && "-rotate-90")} />
            <span className="text-sm font-medium text-ink">{label}</span>
            <span className="text-xs text-ink-muted">({holdings.length})</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGroupRefresh}
              disabled={isRefreshing}
              title={`Refresh prices for ${label}`}
              className="rounded-[var(--radius-control)] p-1 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            </button>
            <span className="font-tabular text-sm text-ink-muted">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {(open || hideHeader) && (
        view === "cards" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {holdings.map((h) => <InvestmentCard key={h.asset.id} holding={h} />)}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-surface-sunken text-left text-xs font-medium text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Avg. Cost</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">P&amp;L</th>
                  <th className="px-4 py-3 text-right">Allocation</th>
                  <th className="px-4 py-3 w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const isGain = h.unrealizedPnl >= 0;
                  const label = getAssetDisplayLabel(h.asset).primary;
                  return (
                    <tr key={h.asset.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-sunken">
                      <td className="px-4 py-3">
                        <Link href={ROUTES.investmentDetail(h.asset.id)} className="flex flex-col">
                          <span className={cn("font-medium text-ink", h.asset.assetType !== "mutual_fund" && h.asset.assetType !== "mutual_fund_debt" && "font-mono")}>{label}</span>
                          <span className={cn("text-xs text-ink-muted", (h.asset.assetType === "mutual_fund" || h.asset.assetType === "mutual_fund_debt") && "font-mono")}>{getAssetDisplayLabel(h.asset).secondary}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-tabular">{h.quantity}</td>
                      <td className="px-4 py-3 text-right font-tabular">{formatCurrencyPrecise(h.weightedAverageCost, h.asset.currency)}</td>
                      <td className="px-4 py-3 text-right font-tabular">{formatCurrency(h.currentValue, h.asset.currency)}</td>
                      <td className={cn("px-4 py-3 text-right font-tabular", isGain ? "text-gain" : "text-loss")}>
                        {formatSignedCurrency(h.unrealizedPnl, h.asset.currency)} ({formatPercent(h.unrealizedPnlPercent)})
                      </td>
                      <td className="px-4 py-3 text-right font-tabular text-ink-muted">{h.allocationPercent.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <AssetRefreshButton assetId={h.asset.id} assetLabel={label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/** Cards are the default view; table is a secondary, opt-in view (MASTER PROMPT "Portfolio"). Pass `flatten` when the page itself is already scoped to one asset class (e.g. via a dedicated sidebar link) — skips the redundant per-group header. */
export function PortfolioView({ holdings, flatten = false }: { holdings: Holding[]; flatten?: boolean }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  function handleRefresh() {
    startRefresh(async () => {
      const result = await refreshLivePricesAction(holdings.map((h) => h.asset.id));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.updated === 0) {
        toast.info("No live prices available for your current holdings.");
      } else {
        toast.success(`Updated ${result.updated} price${result.updated === 1 ? "" : "s"}${result.skipped.length ? ` · ${result.skipped.length} skipped (no live source)` : ""}`);
      }
    });
  }

  const groups = groupHoldings(holdings);

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "cards" | "table")}>
          <TabsList>
            <TabsTrigger value="cards"><LayoutGrid className="mr-1 inline size-3.5" />Cards</TabsTrigger>
            <TabsTrigger value="table"><List className="mr-1 inline size-3.5" />Table</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || holdings.length === 0}>
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} /> Refresh Prices
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Add Investment
          </Button>
        </div>
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No investments yet"
          description="Add your first investment to start tracking your portfolio."
          action={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add Investment</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {flatten ? (
            <HoldingsGroup label="" holdings={holdings} view={view} hideHeader />
          ) : (
            groups.map((g) => <HoldingsGroup key={g.type} label={g.label} holdings={g.holdings} view={view} />)
          )}
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
