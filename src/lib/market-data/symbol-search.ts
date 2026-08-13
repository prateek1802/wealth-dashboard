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

interface MFAPIScheme {
  schemeCode: number;
  schemeName: string;
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
 * mfapi.in's search has no result limit and no relevance ranking — a broad
 * query can return hundreds of scheme codes (Direct/Regular/Growth/IDCW
 * variants of the same underlying fund, which is why two rows can look
 * identical at a glance: they're genuinely different schemes, just with
 * near-identical names). We cap to the first 8 after the request completes
 * — the size of that payload, not our code, is the main reason mutual fund
 * search feels slower than the other two sources.
 */
async function searchMutualFunds(query: string): Promise<SymbolSearchResult[]> {
  try {
    const res = await fetchWithTimeout(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data: MFAPIScheme[] = await res.json();
    const results = data.map(
      (s): SymbolSearchResult => ({
        symbol: String(s.schemeCode),
        name: s.schemeName,
        assetType: /debt|bond|liquid|gilt|income/i.test(s.schemeName) ? "mutual_fund_debt" : "mutual_fund",
        currency: "INR",
        exchange: null,
        country: "India",
      })
    );
    // Scheme code is always unique per scheme, so this dedupe is a no-op
    // for mfapi itself — kept for a consistent contract across all three
    // sources and in case mfapi ever returns a code twice.
    const deduped = dedupe(results);

    // These are NOT duplicates — "Direct"/"Regular" and "Growth"/"IDCW" are
    // genuinely different schemes with different NAVs (different fee
    // structures and payout behavior). But most self-directed investors
    // want "Direct Plan - Growth" specifically, so surface that variant
    // first rather than making it a coin flip which shows up on top.
    const planScore = (name: string) => {
      let score = 0;
      if (/direct/i.test(name)) score += 2;
      if (/growth/i.test(name)) score += 1;
      return score;
    };
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
