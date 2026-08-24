"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { refreshLivePricesAction } from "@/features/portfolio/actions";
import { RefreshCw } from "lucide-react";

/**
 * One-click refresh for every current holding's price, in one go — the
 * dashboard-level counterpart to the per-asset-class and per-asset refresh
 * buttons on the Portfolio page. Calls refreshLivePricesAction() with no
 * assetIds filter, which already means "every current holding".
 */
export function RefreshAllCard() {
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
    <Card className="flex flex-col justify-between gap-3 p-6">
      <span className="text-sm font-medium text-ink-muted">Prices</span>
      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="self-start">
        <RefreshCw className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"} />
        {isRefreshing ? "Refreshing…" : "Refresh all"}
      </Button>
    </Card>
  );
}
