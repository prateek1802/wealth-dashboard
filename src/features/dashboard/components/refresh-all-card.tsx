"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { refreshLivePricesAction } from "@/features/portfolio/actions";
import { refreshAllNPSLiveNAVsAction } from "@/features/nps/actions";
import { RefreshCw } from "lucide-react";

/**
 * One-click refresh for every current holding's price AND every connected
 * NPS scheme's live NAV, in one go — the dashboard-level counterpart to
 * the per-asset-class/per-asset refresh buttons on Portfolio and the
 * per-account "Refresh live NAVs" button on the NPS page.
 *
 * BUGFIX: this used to call only refreshLivePricesAction() (securities) —
 * zero awareness NPS live NAV refresh existed at all, so "Refresh all"
 * didn't actually mean all. Now pools both, and reports a combined count.
 */
export function RefreshAllCard() {
  const [isRefreshing, startRefresh] = useTransition();

  function handleRefresh() {
    startRefresh(async () => {
      const [pricesResult, npsResult] = await Promise.all([refreshLivePricesAction(), refreshAllNPSLiveNAVsAction()]);

      if ("error" in pricesResult) {
        toast.error(pricesResult.error);
        return;
      }
      if (!npsResult.ok) {
        toast.error(npsResult.error);
        return;
      }

      const totalUpdated = pricesResult.updated + npsResult.updated;
      const totalSkipped = pricesResult.skipped.length + npsResult.failed;

      if (totalUpdated === 0) {
        toast.info("No live prices or connected NPS schemes to refresh.");
      } else {
        toast.success(`Updated ${totalUpdated} price${totalUpdated === 1 ? "" : "s"}${totalSkipped ? ` · ${totalSkipped} skipped (no live source)` : ""}`);
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
