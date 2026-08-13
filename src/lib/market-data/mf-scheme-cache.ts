/**
 * Full Indian mutual fund scheme list, cached in memory server-side.
 *
 * mfapi.in's own `/mf/search?q=` endpoint has undocumented, inconsistent
 * matching behavior — testing showed it silently missing schemes that
 * plainly contain the query word (e.g. real "PGIM ... Midcap ..." and
 * "SBI Contra Fund" entries not coming back for reasonable queries). Rather
 * than guess at its matching rules, this fetches mfapi.in's full dump of
 * every scheme ONCE (https://api.mfapi.in/mf — ~30,000 entries, no query
 * needed) and does all matching ourselves, locally, in full control.
 *
 * This also fixes the earlier "search is slow" complaint for mutual funds
 * specifically: after the first fetch (a few seconds, done once per server
 * lifetime), every subsequent mutual fund search is a local array filter —
 * no network round trip at all.
 */

export interface MFScheme {
  schemeCode: number;
  schemeName: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // AMFI's scheme list changes rarely — a day is plenty fresh
const FETCH_TIMEOUT_MS = 15_000; // one-time ~3MB payload — needs more room than the per-keystroke searches

let cache: { schemes: MFScheme[]; fetchedAt: number } | null = null;
let inFlight: Promise<MFScheme[]> | null = null;

async function fetchAllSchemes(): Promise<MFScheme[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.mfapi.in/mf", { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`mfapi.in returned ${res.status}`);
    const data = (await res.json()) as MFScheme[];
    if (!Array.isArray(data) || data.length === 0) throw new Error("mfapi.in returned an empty or unexpected payload");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAllMFSchemes(): Promise<MFScheme[]> {
  const isFresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (isFresh) return cache!.schemes;

  // Coalesce concurrent callers (e.g. several people typing at once, or a
  // burst of debounced searches right after server start) into one fetch.
  if (!inFlight) {
    inFlight = fetchAllSchemes()
      .then((schemes) => {
        cache = { schemes, fetchedAt: Date.now() };
        return schemes;
      })
      .catch((err) => {
        // Fall back to a stale cache if we have one rather than failing
        // the search outright; otherwise let the caller handle the empty result.
        if (cache) return cache.schemes;
        throw err;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
