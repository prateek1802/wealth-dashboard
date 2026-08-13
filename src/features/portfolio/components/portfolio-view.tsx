"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InvestmentCard } from "@/components/shared/investment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { refreshLivePricesAction } from "../actions";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/utils/currency";
import { ASSET_TYPE_LABELS } from "@/constants/asset-types";
import { cn } from "@/lib/utils/cn";
import { Wallet, Plus, LayoutGrid, List, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { Holding } from "@/types/domain/holding";

/** Cards are the default view; table is a secondary, opt-in view (MASTER PROMPT "Portfolio"). */
export function PortfolioView({ holdings }: { holdings: Holding[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  function handleRefresh() {
    startRefresh(async () => {
      const result = await refreshLivePricesAction();
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
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {holdings.map((h) => (
            <InvestmentCard key={h.asset.id} holding={h} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-surface-sunken text-left text-xs font-medium text-ink-muted">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Avg. Cost</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">P&amp;L</th>
                <th className="px-4 py-3 text-right">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const isGain = h.unrealizedPnl >= 0;
                return (
                  <tr key={h.asset.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-sunken">
                    <td className="px-4 py-3">
                      <Link href={ROUTES.investmentDetail(h.asset.id)} className="flex flex-col">
                        <span className="font-mono font-medium text-ink">{h.asset.symbol}</span>
                        <span className="text-xs text-ink-muted">{h.asset.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{ASSET_TYPE_LABELS[h.asset.assetType]}</td>
                    <td className="px-4 py-3 text-right font-tabular">{h.quantity}</td>
                    <td className="px-4 py-3 text-right font-tabular">{formatCurrency(h.weightedAverageCost, h.asset.currency)}</td>
                    <td className="px-4 py-3 text-right font-tabular">{formatCurrency(h.currentValue, h.asset.currency)}</td>
                    <td className={cn("px-4 py-3 text-right font-tabular", isGain ? "text-gain" : "text-loss")}>
                      {formatSignedCurrency(h.unrealizedPnl, h.asset.currency)} ({formatPercent(h.unrealizedPnlPercent)})
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-ink-muted">{h.allocationPercent.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
