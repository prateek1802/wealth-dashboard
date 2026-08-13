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
