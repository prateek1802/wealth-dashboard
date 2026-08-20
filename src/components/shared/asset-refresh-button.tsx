"use client";
import { useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshLivePricesAction } from "@/features/portfolio/actions";
import { cn } from "@/lib/utils/cn";

/**
 * Refreshes the live price for a SINGLE asset. Wraps the same
 * refreshLivePricesAction used for the group/portfolio-wide refresh
 * buttons, just scoped to one asset id, so all three refresh levels
 * (single asset, asset-class group, whole portfolio) share one code path.
 *
 * Safe to place inside a <Link> card (e.g. InvestmentCard): stops
 * propagation and prevents navigation on click.
 */
export function AssetRefreshButton({
  assetId,
  assetLabel,
  iconClassName = "size-3.5",
  className,
}: {
  assetId: string;
  assetLabel: string;
  iconClassName?: string;
  className?: string;
}) {
  const [isRefreshing, startRefresh] = useTransition();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startRefresh(async () => {
      const result = await refreshLivePricesAction([assetId]);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.updated === 0) {
        toast.info(`No live price source for ${assetLabel}.`);
      } else {
        toast.success(`${assetLabel} price updated`);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isRefreshing}
      title={`Refresh price for ${assetLabel}`}
      className={cn("h-7 w-7 text-ink-muted hover:text-ink", className)}
    >
      <RefreshCw className={cn(iconClassName, isRefreshing && "animate-spin")} />
    </Button>
  );
}
