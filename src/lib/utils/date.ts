import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function formatDate(iso: string, pattern: string = "d MMM yyyy"): string {
  return format(parseISO(iso), pattern);
}

export function formatRelative(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
