import { formatRelative, isStale } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/**
 * NPS already shows this for its own scheme NAVs (last_nav_date, with its
 * own separate staleness handling) — this is the securities-side
 * equivalent, using currentPriceUpdatedAt, which existed on Asset but was
 * never surfaced anywhere in the UI. Shown as relative time ("3 hours
 * ago") rather than a raw date — more immediately readable for "is this
 * fresh enough to trust right now", which is the actual question this
 * answers. Turns to the same danger color used elsewhere in this app
 * (text-loss) past 24h stale — no dedicated "warning" token exists in this
 * design system, and reusing the existing theme-aware danger color keeps
 * this correct in dark mode; a raw Tailwind color (amber-600) would not be.
 *
 * Renders nothing when there's no timestamp yet (a newly-added asset with
 * no live price refresh yet) — not an empty muted line taking up space for
 * no reason.
 */
export function PriceFreshness({ updatedAt, className }: { updatedAt: string | null; className?: string }) {
  if (!updatedAt) return null;
  const stale = isStale(updatedAt);
  return (
    <span className={cn("text-xs", stale ? "text-loss" : "text-ink-muted", className)}>
      {stale && "⚠ "}
      {formatRelative(updatedAt)}
    </span>
  );
}
