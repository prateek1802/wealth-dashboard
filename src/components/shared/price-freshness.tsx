import { formatRelative, isStale } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/**
 * NPS already shows this for its own scheme NAVs (last_nav_date, with its
 * own separate staleness handling) — this is the securities-side
 * equivalent, using currentPriceUpdatedAt, which existed on Asset but was
 * never surfaced anywhere in the UI.
 *
 * Two modes:
 * - compact (default false): a small colored dot, no text — for
 *   space-constrained grids (Investment Card, Portfolio table) where a
 *   full "X minutes ago" line broke row alignment across a card's 3-column
 *   Qty/Avg Cost/Current Price grid (uneven row heights depending on
 *   whether that column had a freshness line). The full relative time is
 *   still available via the native title tooltip on hover.
 * - text: the original full "X minutes ago" line, for Investment Detail's
 *   dedicated per-metric tiles, which have room to spare.
 *
 * Turns to this app's existing `text-loss`/`bg-loss` color past 24h stale
 * — no dedicated "warning" token exists in this design system, and reusing
 * the existing theme-aware danger color keeps this correct in dark mode; a
 * raw Tailwind color would not be.
 *
 * Renders nothing when there's no timestamp yet (a newly-added asset with
 * no live price refresh yet) — not an empty dot/line taking up space for
 * no reason.
 */
export function PriceFreshness({ updatedAt, mode = "compact", className }: { updatedAt: string | null; mode?: "compact" | "text"; className?: string }) {
  if (!updatedAt) return null;
  const stale = isStale(updatedAt);
  const relative = formatRelative(updatedAt);

  if (mode === "compact") {
    return <span title={`Price updated ${relative}`} className={cn("inline-block size-1.5 shrink-0 rounded-full", stale ? "bg-loss" : "bg-gain", className)} />;
  }

  return (
    <span className={cn("text-xs", stale ? "text-loss" : "text-ink-muted", className)}>
      {stale && "⚠ "}
      {relative}
    </span>
  );
}
