import type { MarketDataProvider, Quote, HistoricalPrice } from "./provider";
import type { Asset } from "@/types/domain/asset";

/**
 * LIVE market data — free, no-API-key sources. This is the provider you
 * plug in when you're ready for real-time-ish prices (V1 shipped with
 * manual entry only; this is the seam the architecture reserved for it).
 *
 * - Crypto: CoinGecko's public simple-price endpoint.
 * - Indian mutual funds: mfapi.in — free, no-key, AMFI-backed daily NAV.
 * - Stocks/ETFs/bonds: Yahoo Finance's public chart endpoint (unofficial —
 *   no key required, but not a documented/SLA'd API; Yahoo can change or
 *   rate-limit it without notice). Indian symbols need a `.NS` (NSE) or
 *   `.BO` (BSE) suffix, e.g. "HDFCBANK.NS" — see getQuote below for how
 *   that mapping happens.
 *
 * For anything production-grade (reliability, uptime guarantees, higher
 * rate limits), swap this for a paid provider (e.g. Twelve Data, Finnhub,
 * Alpha Vantage, or a broker's own data API) — same MarketDataProvider
 * interface, no calling code changes.
 */

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  DOT: "polkadot",
  LTC: "litecoin",
};

async function getCryptoQuote(symbol: string): Promise<Quote | null> {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return null;
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=inr`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.[id]?.inr;
    if (typeof price !== "number") return null;
    return { symbol, price, asOf: new Date().toISOString(), source: "live" };
  } catch {
    return null;
  }
}

/**
 * Yahoo's chart endpoint wants an exchange suffix for non-US symbols.
 * `exchange`/`country` on the asset (see DATABASE.md) drive this mapping —
 * this is exactly what those nullable metadata columns were reserved for.
 */
function toYahooSymbol(asset: Pick<Asset, "symbol" | "assetType" | "exchange" | "country">): string {
  if (asset.assetType === "stock_us") return asset.symbol;
  if (asset.exchange === "BSE") return `${asset.symbol}.BO`;
  // Default Indian-listed securities (stock_in, most etf/mutual_fund entries) to NSE.
  if (asset.country === "India" || asset.assetType === "stock_in") return `${asset.symbol}.NS`;
  return asset.symbol;
}

async function getEquityQuote(asset: Pick<Asset, "symbol" | "assetType" | "exchange" | "country">): Promise<Quote | null> {
  const yahooSymbol = toYahooSymbol(asset);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price !== "number") return null;
    return { symbol: asset.symbol, price, asOf: new Date().toISOString(), source: "live" };
  } catch {
    return null;
  }
}

async function getMutualFundQuote(schemeCode: string): Promise<Quote | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}/latest`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data?.data?.[0];
    const price = latest?.nav ? parseFloat(latest.nav) : NaN;
    if (!Number.isFinite(price)) return null;
    return { symbol: schemeCode, price, asOf: new Date().toISOString(), source: "live" };
  } catch {
    return null;
  }
}

/** Routes by asset type. Cash, FD, PPF have no market quote — always null (manual/derived by design). NPS scheme-level NAV is handled separately (see fetchNPSNAVSchemeIndex/fetchNPSNAVQuote below), since it isn't an Asset row and doesn't go through this MarketDataProvider interface. */
export function createLiveMarketDataProvider(): MarketDataProvider {
  return {
    async getQuote(symbol: string): Promise<Quote | null> {
      // Convenience overload for crypto-only lookups (symbol alone is enough).
      return getCryptoQuote(symbol);
    },
    async getHistoricalPrices(): Promise<HistoricalPrice[]> {
      // Free tiers of both sources rate-limit historical ranges aggressively;
      // V1 does not attempt to backfill history from live quotes — see
      // ARCHITECTURE.md "Known trade-offs". Snapshots build history over time instead.
      return [];
    },
  };
}

/** The routing version actually used by the refresh action — needs the full asset, not just a symbol string. */
export async function getLiveQuoteForAsset(asset: Pick<Asset, "symbol" | "assetType" | "exchange" | "country">): Promise<Quote | null> {
  if (asset.assetType === "crypto") return getCryptoQuote(asset.symbol);
  if (asset.assetType === "mutual_fund" || asset.assetType === "mutual_fund_debt") return getMutualFundQuote(asset.symbol);
  if (["stock_in", "stock_us", "etf", "bond"].includes(asset.assetType)) {
    return getEquityQuote(asset);
  }
  return null;
}

// ---------------------------------------------------------------------------
// NPS live NAV — npsnav.in (free, no-key, compiles Protean/NSDL's daily
// public NAV disclosures; see https://npsnav.in/nps-api). Verified against
// the real, documented API before wiring this in.
//
// Deliberately NOT auto-matched to a subscriber's PFM/scheme: npsnav.in's
// scheme_code naming isn't something this app can reliably map from a PFM
// name + E/C/G/A letter without risking a silently-wrong NAV attached to
// the wrong fund, which would corrupt a real corpus figure. So a scheme
// only gets live refresh after the user searches and confirms the exact
// match once (see npsService.linkSchemeToNAVSource) — this file only
// exposes the two building blocks (search, quote), never a guess.
//
// LICENSING NOTE: npsnav.in's dataset is licensed CC BY-NC 4.0 — personal,
// educational, and non-commercial use only; commercial use/redistribution
// needs their permission. Fine for a personal finance tracker used by its
// owner; worth knowing if this app is ever used more broadly.
// ---------------------------------------------------------------------------

export interface NPSNAVSchemeInfo {
  schemeCode: string;
  schemeName: string;
}

/** Every known NPS scheme (all PFMs, all asset classes) — powers the one-time "search and confirm" mapping UI, never used for automatic matching. */
export async function fetchNPSNAVSchemeIndex(): Promise<NPSNAVSchemeInfo[]> {
  try {
    const res = await fetch("https://npsnav.in/api/schemes", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = data?.data;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r: unknown): r is [string, string] => Array.isArray(r) && typeof r[0] === "string" && typeof r[1] === "string")
      .map(([schemeCode, schemeName]) => ({ schemeCode, schemeName }));
  } catch {
    return [];
  }
}

/** Latest NAV for one scheme code the user has already confirmed via fetchNPSNAVSchemeIndex(). Returns null on any failure — caller treats that as "couldn't refresh this one", never throws. */
export async function fetchNPSNAVQuote(schemeCode: string): Promise<{ nav: number; asOf: string } | null> {
  try {
    const res = await fetch(`https://npsnav.in/api/${encodeURIComponent(schemeCode)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    const nav = parseFloat(text);
    if (!Number.isFinite(nav)) return null;
    return { nav, asOf: new Date().toISOString() };
  } catch {
    return null;
  }
}
