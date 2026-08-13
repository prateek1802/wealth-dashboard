import type { AssetType } from "@/constants/asset-types";

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: string;
  exchange: string | null;
  country: string | null;
}

/**
 * Symbol search — backs the "Add Investment" autocomplete so you pick the
 * exact tradeable symbol/scheme instead of typing a free-text name that
 * Refresh Prices then can't match. Three free, no-key sources, queried in
 * parallel: Yahoo Finance (stocks/ETFs), mfapi.in (Indian mutual funds,
 * AMFI-backed), CoinGecko (crypto).
 *
 * PERFORMANCE: each source gets its own timeout (see SEARCH_TIMEOUT_MS)
 * and results are gathered with allSettled, not all — so one slow or
 * rate-limited source (CoinGecko's free tier, in particular) can never
 * hold up the other two. A source that times out just contributes zero
 * results for that query instead of freezing the whole search.
 */

const SEARCH_TIMEOUT_MS = 2500;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Case-insensitive dedupe by (symbol, assetType) — keeps the first occurrence. Removes the NSE/BSE-duplicate and any other same-symbol repeats a source returns. */
function dedupe(results: SymbolSearchResult[]): SymbolSearchResult[] {
  const seen = new Set<string>();
  const out: SymbolSearchResult[] = [];
  for (const r of results) {
    const key = `${r.symbol.toUpperCase()}|${r.assetType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

interface YahooSearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
}

async function searchEquities(query: string): Promise<SymbolSearchResult[]> {
  try {
    const res = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const quotes: YahooSearchQuote[] = data?.quotes ?? [];

    const results = quotes
      .filter((q) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF"))
      .map((q): SymbolSearchResult => {
        const isNSE = q.symbol.endsWith(".NS");
        const isBSE = q.symbol.endsWith(".BO");
        const bareSymbol = q.symbol.replace(/\.(NS|BO)$/, "");
        const assetType: AssetType = q.quoteType === "ETF" ? "etf" : isNSE || isBSE ? "stock_in" : "stock_us";
        return {
          symbol: bareSymbol,
          name: q.longname ?? q.shortname ?? bareSymbol,
          assetType,
          currency: isNSE || isBSE ? "INR" : "USD",
          exchange: isNSE ? "NSE" : isBSE ? "BSE" : (q.exchange ?? null),
          country: isNSE || isBSE ? "India" : q.exchange ? "United States" : null,
        };
      });

    // NSE-listed and BSE-listed rows collapse to the same bare symbol once
    // the suffix is stripped — dedupe() keeps whichever came first, which
    // Yahoo consistently orders NSE-first for dual-listed Indian stocks.
    return dedupe(results).slice(0, 8);
  } catch {
    return [];
  }
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

async function searchCrypto(query: string): Promise<SymbolSearchResult[]> {
  try {
    const res = await fetchWithTimeout(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const coins: CoinGeckoCoin[] = data?.coins ?? [];
    const results = coins.map(
      (c): SymbolSearchResult => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        assetType: "crypto",
        currency: "INR",
        exchange: null,
        country: null,
      })
    );
    return dedupe(results).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Indian mutual funds — mfapi.in, a free, no-key, community-run API backed
 * by AMFI's daily NAV feed. We store the scheme code AS the asset's
 * `symbol` (e.g. "119551") — not pretty to look at, but it's the exact key
 * getMutualFundQuote() needs, and `name` carries the readable scheme name
 * for display. AMFI/mfapi.in publishes NAV once per business day (mutual
 * funds don't have "intraday" prices), so Refresh Prices updates this to
 * the latest published NAV, not a live tick.
 *
 * Matching is done entirely locally against the full cached scheme list
 * (see mf-scheme-cache.ts) rather than trusting mfapi.in's own `/search`
 * endpoint, whose matching behavior proved inconsistent for real fund
 * names. A scheme matches if every word in the query appears somewhere in
 * its name, in any order and case-insensitively — "pgim midcap" matches
 * "PGIM India Midcap Opportunities Fund" even though the words aren't
 * adjacent in the real name.
 *
 * Direct/Regular and Growth/IDCW variants are NOT duplicates — they're
 * genuinely different schemes with different NAVs (different fee
 * structures and payout behavior) — but "Direct Plan - Growth" is what
 * most self-directed investors want, so that variant is sorted first
 * rather than left to chance.
 */
/**
 * Whether a mutual fund scheme name matches a search query: every word in
 * the query must appear somewhere in the name, in any order,
 * case-insensitively. Exported and unit-tested directly (see
 * test/mf-search-matching.test.ts) since this exact logic broke twice
 * before — once trusting mfapi.in's own search endpoint too much, once
 * from a leftover code-merge bug. It no longer depends on any network call.
 */
export function matchesMFQuery(schemeName: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return false;
  const lower = schemeName.toLowerCase();
  return words.every((w) => lower.includes(w));
}

async function searchMutualFunds(query: string): Promise<SymbolSearchResult[]> {
  try {
    const { getAllMFSchemes } = await import("./mf-scheme-cache");

    // The full scheme list can take up to ~15s to download on the very
    // first search after a fresh server start (see FETCH_TIMEOUT_MS in
    // mf-scheme-cache.ts) — that download keeps running in the background
    // regardless, but THIS particular keystroke's search shouldn't make
    // the whole combined search (equities + crypto too) wait on it. Race
    // it against a shorter local timeout instead: if the cache isn't warm
    // yet, this search comes back empty just for mutual funds, and the
    // very next search (once the background fetch finishes) is instant.
    const schemesOrTimeout = await Promise.race([
      getAllMFSchemes(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (!schemesOrTimeout) return [];
    const allSchemes = schemesOrTimeout;

    const matches = allSchemes.filter((s) => matchesMFQuery(s.schemeName, query));

    const results = matches.map(
      (s): SymbolSearchResult => ({
        symbol: String(s.schemeCode),
        name: s.schemeName,
        assetType: /debt|bond|liquid|gilt|income/i.test(s.schemeName) ? "mutual_fund_debt" : "mutual_fund",
        currency: "INR",
        exchange: null,
        country: "India",
      })
    );

    const planScore = (name: string) => {
      let score = 0;
      if (/direct/i.test(name)) score += 2;
      if (/growth/i.test(name)) score += 1;
      return score;
    };
    const deduped = dedupe(results);
    deduped.sort((a, b) => planScore(b.name) - planScore(a.name));

    return deduped.slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Runs all three sources in parallel with allSettled (not all) — a timeout
 * or error in one source never blocks the other two from returning. Also
 * runs one final dedupe across the merged list, in case the same symbol
 * legitimately appears from more than one source.
 */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const settled = await Promise.allSettled([searchEquities(trimmed), searchMutualFunds(trimmed), searchCrypto(trimmed)]);
  const merged = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return dedupe(merged);
}
