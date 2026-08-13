/**
 * Normalizes a date string from an arbitrary CSV cell into strict ISO
 * (yyyy-MM-dd) — the only format the rest of the app trusts (date-fns'
 * parseISO, used everywhere for display, is intentionally strict and does
 * NOT accept "15-04-2023" or "4/15/2023"). This is the actual fix for the
 * "Invalid time value" crash: the import validation previously used
 * Date.parse(), which is far more lenient than parseISO() — it accepted
 * (and silently stored, unnormalized) date formats that later crashed the
 * page the moment they were displayed. Every date reaching storage now
 * goes through this first.
 *
 * Handles, in order: strict ISO, DD/MM/YYYY or DD-MM-YYYY (day-first is
 * assumed when ambiguous, since this app's data is India-centric — e.g.
 * "04/05/2023" is read as 4 May, not April 5th), Excel's numeric date
 * serial (common when a spreadsheet cell wasn't formatted as text before
 * export), and a last-resort native Date.parse fallback for anything else
 * unambiguous (e.g. "15 Apr 2023"). Returns null if nothing works — the
 * caller should treat that as a per-row import error, not a guess.
 */
export function normalizeDateString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const isValidYMD = (y: number, m: number, d: number) => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  };

  // Already ISO (yyyy-MM-dd, optionally with a time component).
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return isValidYMD(+y, +m, +d) ? `${y}-${pad(+m)}-${pad(+d)}` : null;
  }

  // DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, MM-DD-YYYY.
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, aStr, bStr, yStr] = slashMatch;
    let day = Number(aStr);
    let month = Number(bStr);
    const year = Number(yStr);
    if (day > 12 && month <= 12) {
      // Unambiguous: first component can't be a month, so it's DD-MM.
    } else if (month > 12 && day <= 12) {
      // Unambiguous the other way — swap.
      [day, month] = [month, day];
    }
    // else: both <= 12, genuinely ambiguous — default to day-first.
    return isValidYMD(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }

  // Excel date serial (days since 1899-12-30) — happens when a CSV cell
  // wasn't formatted as text/date before export and Excel dumped the
  // underlying number instead (typically a 5-digit value for 1990s–2030s dates).
  if (/^\d{4,6}$/.test(trimmed)) {
    const serial = Number(trimmed);
    const ms = Date.UTC(1899, 11, 30) + serial * 86_400_000;
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime()) && date.getUTCFullYear() > 1950 && date.getUTCFullYear() < 2100) {
      return date.toISOString().slice(0, 10);
    }
  }

  // Last resort: native parsing for formats like "15 Apr 2023" or "Apr 15, 2023" —
  // unambiguous enough that Date.parse's leniency is safe here.
  const nativeParsed = new Date(trimmed);
  if (!Number.isNaN(nativeParsed.getTime())) {
    return nativeParsed.toISOString().slice(0, 10);
  }

  return null;
}
