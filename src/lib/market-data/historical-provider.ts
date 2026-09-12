import { normalizeDateString } from "@/lib/utils/date-normalize";
import { toYahooSymbol, COINGECKO_IDS } from "./live-provider";
import type { Asset } from "@/types/domain/asset";

/**
 * One-time historical backfill sources — separate from live-provider.ts's
 * "latest quote" functions, and deliberately NOT called on every render or
 * every Refresh Prices click (see priceHistoryRepository.recordBackfillBatch
 * and its 'backfill' vs 'manual' source distinction in schema.sql). Each
 * fetcher below was verified directly against the real, current API before
 * being written — not assumed from memory or from older docs — per this
 * project's established rule for every external market-data integration.
 *
 * Every function here returns [] on any failure (never throws) and never
 * fabricates a point for a date it couldn't get real data for — same
 * invariant as the rest of this project's market-data code.
 */

export interface HistoricalPricePoint {
  date: string; // ISO YYYY-MM-DD
  price: number;
}

/**
 * mfapi.in's per-scheme endpoint WITHOUT "/latest" returns the fund's
 * entire historical NAV series (verified live: api.mfapi.in/mf/{code} —
 * no depth limit observed, dates as "DD-MM-YYYY", nav as a string).
 * Fetching the full series unfiltered is simplest and most robust for a
 * one-time backfill — no pagination or date-range chunking needed.
 */
export function parseMFAPIHistoryResponse(data: unknown): HistoricalPricePoint[] {
  const rows = (data as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const points: HistoricalPricePoint[] = [];
  for (const row of rows) {
    const dateRaw = (row as Record<string, unknown>)?.date;
    const navRaw = (row as Record<string, unknown>)?.nav;
    if (typeof dateRaw !== "string" || typeof navRaw !== "string") continue;
    const date = normalizeDateString(dateRaw);
    const price = parseFloat(navRaw);
    if (!date || !Number.isFinite(price)) continue; // skip unparseable rows rather than failing the whole backfill
    points.push({ date, price });
  }
  return points;
}

export async function fetchMutualFundHistoricalPrices(schemeCode: string): Promise<HistoricalPricePoint[]> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`, { cache: "no-store" });
    if (!res.ok) return [];
    return parseMFAPIHistoryResponse(await res.json());
  } catch {
    return [];
  }
}

/**
 * Yahoo's chart endpoint (same host/path as live-provider.ts's
 * getEquityQuote, just a longer range) supports range=max, which returns
 * the symbol's entire available daily history — verified against multiple
 * current (2026) independent sources describing this exact endpoint/param
 * shape; Yahoo itself publishes no official docs, so "verified" here means
 * cross-checked against several current write-ups, not a single source.
 * Still the same unofficial/no-SLA caveat as the rest of this app's Yahoo
 * usage (see live-provider.ts's top-of-file comment).
 */
export function parseYahooChartHistoryResponse(data: unknown): HistoricalPricePoint[] {
  const result = (data as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as
    | { timestamp?: unknown; indicators?: { quote?: { close?: unknown }[] } }
    | undefined;
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(timestamps) || !Array.isArray(closes)) return [];
  const points: HistoricalPricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const close = closes[i];
    if (typeof ts !== "number" || typeof close !== "number" || !Number.isFinite(close)) continue; // Yahoo returns null close for some days within range (holidays/gaps) — skip rather than fabricate
    points.push({ date: new Date(ts * 1000).toISOString().slice(0, 10), price: close });
  }
  return points;
}

export async function fetchEquityHistoricalPrices(asset: Pick<Asset, "symbol" | "assetType" | "exchange" | "country">): Promise<HistoricalPricePoint[]> {
  const yahooSymbol = toYahooSymbol(asset);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=max`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    return parseYahooChartHistoryResponse(await res.json());
  } catch {
    return [];
  }
}

/**
 * CoinGecko's public (no-key) tier caps historical data to the past 365
 * days — confirmed directly from CoinGecko's own support docs, not assumed
 * ("with the public plan, access to historical data is limited to the past
 * 365 days"). This is a real, external limit, not a choice this app is
 * making — a crypto holding older than a year genuinely has no fetchable
 * exact history here, and reconstructHistoricalNetWorth (see
 * PROJECT-STATUS.md's graph-accuracy work) needs to fall back to the
 * snapshot approximation beyond this window, same as it does for NPS,
 * just for a different reason. /market_chart/range's granularity is
 * "auto" — a 365-day window returns daily points, which is what this
 * fetcher relies on rather than requesting an interval explicitly.
 */
export function parseCoinGeckoRangeResponse(data: unknown): HistoricalPricePoint[] {
  const prices = (data as { prices?: unknown })?.prices;
  if (!Array.isArray(prices)) return [];
  const byDate = new Map<string, number>(); // last point per calendar day wins (closest to that day's close)
  for (const entry of prices) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [ms, price] = entry;
    if (typeof ms !== "number" || typeof price !== "number" || !Number.isFinite(price)) continue;
    byDate.set(new Date(ms).toISOString().slice(0, 10), price);
  }
  return Array.from(byDate.entries()).map(([date, price]) => ({ date, price }));
}

export async function fetchCryptoHistoricalPrices(symbol: string): Promise<HistoricalPricePoint[]> {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return [];
  const to = Math.floor(Date.now() / 1000);
  const from = to - 365 * 86_400; // the hard cap of the free tier — see doc comment above
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=inr&from=${from}&to=${to}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return parseCoinGeckoRangeResponse(await res.json());
  } catch {
    return [];
  }
}

/** Asset types a real historical source exists for (see fetchHistoricalPricesForAsset) — drives whether the "Backfill history" button shows at all. */
export const BACKFILLABLE_ASSET_TYPES = ["crypto", "mutual_fund", "mutual_fund_debt", "stock_in", "stock_us", "etf", "bond"] as const;

/** Routes by asset type, same shape as live-provider.ts's getLiveQuoteForAsset — FD/PPF/Bank/NPS aren't Assets and have no market history to fetch here (FD's is computed deterministically instead; see calculateFDValueAsOf). */
export async function fetchHistoricalPricesForAsset(asset: Pick<Asset, "symbol" | "assetType" | "exchange" | "country">): Promise<HistoricalPricePoint[]> {
  if (asset.assetType === "crypto") return fetchCryptoHistoricalPrices(asset.symbol);
  if (asset.assetType === "mutual_fund" || asset.assetType === "mutual_fund_debt") return fetchMutualFundHistoricalPrices(asset.symbol);
  if (["stock_in", "stock_us", "etf", "bond"].includes(asset.assetType)) return fetchEquityHistoricalPrices(asset);
  return [];
}
