"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { backfillAllAssetHistoryAction } from "@/features/portfolio/actions";
import { History } from "lucide-react";

/**
 * Lives on the Holdings hub (the sidebar-linked top-level page) rather than
 * buried inside a single filtered /portfolio?type=... category view — it's
 * a global, cross-category action (every backfillable holding, regardless
 * of type), so it belongs on the page that's actually the "all holdings"
 * home, not nested one level deeper. A daily cron (see
 * api/cron/backfill-history) now also runs this automatically, so this
 * button is for an on-demand top-up, not the only way it happens.
 */
export function BackfillAllHistoryButton() {
  const [isBackfilling, startBackfill] = useTransition();

  function handleClick() {
    startBackfill(async () => {
      const result = await backfillAllAssetHistoryAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.assetsBackfilled === 0) {
        toast.info("No holdings with a historical price source to backfill.");
      } else {
        toast.success(
          `Backfilled ${result.assetsBackfilled} holding${result.assetsBackfilled === 1 ? "" : "s"} · ${result.totalPointsAdded} price${result.totalPointsAdded === 1 ? "" : "s"} added${result.assetsSkipped ? ` · ${result.assetsSkipped} failed` : ""}`
        );
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isBackfilling}
      title="One-time (or top-up) fetch of real historical prices for every eligible holding — mutual funds, stocks, ETFs, crypto. Also runs automatically once a day."
    >
      <History className="size-3.5" /> {isBackfilling ? "Backfilling…" : "Backfill All History"}
    </Button>
  );
}
