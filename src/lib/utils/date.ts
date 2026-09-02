import { format, formatDistanceToNowStrict, parseISO, isValid } from "date-fns";

/**
 * Defensive by design: a malformed date string (most commonly from a CSV
 * import with an unrecognized date format that slipped past validation)
 * must never crash the page it's rendered on. Falls back to the raw
 * string rather than throwing — a single bad row degrades gracefully
 * instead of taking down the whole list.
 */
export function formatDate(iso: string, pattern: string = "d MMM yyyy"): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso || "—";
  return format(parsed, pattern);
}

export function formatRelative(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso || "—";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * True when `iso` is more than `thresholdHours` old. Used to flag a stale
 * price/data timestamp in the UI (e.g. a security's last live-price
 * refresh) — general-purpose, not tied to any one asset class. Defaults to
 * 24h: a security's price realistically shouldn't go a full trading day+
 * without a refresh if the user is actively using "Refresh all"/per-asset
 * refresh, so anything older is worth flagging, not just visually
 * decorating.
 */
export function isStale(iso: string, thresholdHours: number = 24): boolean {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return false;
  return Date.now() - parsed.getTime() > thresholdHours * 60 * 60 * 1000;
}
