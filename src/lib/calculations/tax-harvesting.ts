import type { AssetType } from "@/constants/asset-types";
import type { Transaction, Lot } from "@/types/domain/transaction";
import { matchFIFOLots } from "./lots";

/**
 * Indian capital gains classification for a single lot/sale, as of this
 * module's last verification (FY 2025-26 / AY 2026-27 rules — Budget 2024's
 * July 2024 changes, unchanged by Budget 2025 and Budget 2026).
 *
 * - "short_term" / "long_term": the normal STCG/LTCG split. A short-term
 *   LOSS can be set off against BOTH short-term and long-term GAINS. A
 *   long-term LOSS can only be set off against long-term GAINS (Sections
 *   70/71) — this asymmetry is the whole reason "which bucket" matters for
 *   harvesting, not just "gain or loss".
 * - "flat_rate_vda": crypto/VDAs (Section 115BBH) — flat 30% tax on any
 *   gain, NO short/long distinction, and — critically — a VDA LOSS CANNOT
 *   be set off against any other gain or income, not even another VDA's
 *   gain. There is no such thing as "harvesting" a crypto loss under
 *   current Indian law; it simply cannot offset anything. Never grouped
 *   with the offsettable totals below.
 * - "unsupported": bonds have their own rules (zero-coupon bonds,
 *   sovereign gold bonds, market-linked debentures, tax-free bonds, etc.
 *   are all treated differently) that aren't reliably modeled from a
 *   simple acquisition date, so this module deliberately does not guess a
 *   rate for them.
 *
 * This is informational, not tax advice — holding-period math here is a
 * simple day-count and doesn't handle every edge case (e.g. the exact
 * month-boundary conventions tax authorities use). Verify anything
 * consequential with a CA before acting on it.
 */
export type GainClassification = "short_term" | "long_term" | "flat_rate_vda" | "unsupported";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / DAY_MS);
}

/** The long-term threshold in days for asset types that have one (crypto and bonds are handled separately, before this is called). */
function longTermThresholdDays(assetType: AssetType): number {
  if (assetType === "stock_us") return 730; // foreign/unlisted equity — 24 months, Section 112
  if (assetType === "mutual_fund_debt") {
    // Debt MF bought on/after 1 Apr 2023 never gets long-term treatment at
    // all (see classifyCapitalGainType) — this branch only runs for units
    // bought before that date, which still get the pre-existing 24-month rule.
    return 730;
  }
  return 365; // stock_in, etf (assumed Indian-listed equity ETF), mutual_fund (equity-oriented) — 12 months, Section 112A
}

export function classifyCapitalGainType(assetType: AssetType, acquiredDate: string, asOfDate: string): GainClassification {
  if (assetType === "crypto") return "flat_rate_vda";
  if (assetType === "bond") return "unsupported";

  if (assetType === "mutual_fund_debt" && acquiredDate >= "2023-04-01") {
    // Post-1-Apr-2023 debt MF units: always short-term/slab-rate, no LTCG regardless of holding period.
    return "short_term";
  }

  const holdingDays = daysBetween(acquiredDate, asOfDate);
  return holdingDays > longTermThresholdDays(assetType) ? "long_term" : "short_term";
}

/** How many more days until this lot crosses into long-term treatment — null if already long-term, already flat-rate/unsupported, or (debt MF post-Apr-2023) never will. */
export function daysUntilLongTerm(assetType: AssetType, acquiredDate: string, asOfDate: string): number | null {
  const classification = classifyCapitalGainType(assetType, acquiredDate, asOfDate);
  if (classification !== "short_term") return null;
  if (assetType === "mutual_fund_debt" && acquiredDate >= "2023-04-01") return null; // will never become long-term
  const threshold = longTermThresholdDays(assetType);
  const held = daysBetween(acquiredDate, asOfDate);
  return threshold - held;
}

export interface HarvestableLot {
  assetId: string;
  quantity: number;
  costBasisPerUnit: number;
  currentPrice: number;
  acquiredDate: string;
  holdingDays: number;
  classification: GainClassification;
  /** Positive number — the unrealized loss on this lot. */
  lossAmount: number;
  /** Days until this lot would cross into long-term treatment, if still short-term and applicable. */
  daysUntilLongTerm: number | null;
}

/**
 * Every OPEN lot (from FIFO matching — see lots.ts) currently sitting at an
 * unrealized LOSS for one asset, as of `asOfDate`. Lots at a gain are
 * simply omitted — there's nothing to harvest there. Crypto lots ARE
 * included (with classification "flat_rate_vda") so the UI can show them
 * explicitly rather than silently hide them, but the caller must not treat
 * their lossAmount as offsettable against anything — see the type's doc.
 */
export function findHarvestableLots(assetId: string, assetType: AssetType, transactions: Transaction[], currentPrice: number | null, asOfDate: string): HarvestableLot[] {
  if (currentPrice == null) return [];
  const openLots = matchFIFOLots(transactions);

  const result: HarvestableLot[] = [];
  for (const lot of openLots) {
    const lossPerUnit = lot.costBasisPerUnit - currentPrice;
    if (lossPerUnit <= 0) continue; // at a gain or breakeven — not harvestable
    const classification = classifyCapitalGainType(assetType, lot.acquiredDate, asOfDate);
    result.push({
      assetId,
      quantity: lot.quantity,
      costBasisPerUnit: lot.costBasisPerUnit,
      currentPrice,
      acquiredDate: lot.acquiredDate,
      holdingDays: daysBetween(lot.acquiredDate, asOfDate),
      classification,
      lossAmount: lossPerUnit * lot.quantity,
      daysUntilLongTerm: daysUntilLongTerm(assetType, lot.acquiredDate, asOfDate),
    });
  }
  return result;
}

export interface RealizedGainEvent {
  sellDate: string;
  acquiredDate: string;
  quantity: number;
  /** Can be negative — a realized loss counts too, for completeness of the FY total. */
  gain: number;
  classification: GainClassification;
}

/**
 * Every realized gain/loss EVENT for one asset — one entry per FIFO-matched
 * (lot, sell) pair, each individually classified by ITS OWN matched lot's
 * acquisition date (a single SELL can span lots bought at different times,
 * some short-term, some long-term, at the moment of that sale).
 *
 * This deliberately duplicates lots.ts's calculateRealizedPnL()'s core FIFO
 * loop rather than extending it, since that function is a single running
 * total used elsewhere (P&L totals) and changing its return shape risks
 * destabilizing already-relied-upon callers; this needs the per-event
 * detail (dates + classification) that a running total can't expose.
 */
export function matchRealizedGainEvents(assetType: AssetType, transactions: Transaction[]): RealizedGainEvent[] {
  const ordered = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
  const openLots: Lot[] = [];
  const events: RealizedGainEvent[] = [];

  for (const t of ordered) {
    if (t.transactionType === "BUY") {
      const costBasisPerUnit = t.price + (t.fees + t.taxes) / t.quantity;
      openLots.push({ quantity: t.quantity, costBasisPerUnit, acquiredDate: t.transactionDate });
      continue;
    }

    const sellProceedsPerUnit = t.price - (t.fees + t.taxes) / t.quantity;
    let remainingToSell = t.quantity;
    while (remainingToSell > 1e-9 && openLots.length > 0) {
      const lot = openLots[0];
      const consumed = Math.min(lot.quantity, remainingToSell);
      events.push({
        sellDate: t.transactionDate,
        acquiredDate: lot.acquiredDate,
        quantity: consumed,
        gain: consumed * (sellProceedsPerUnit - lot.costBasisPerUnit),
        classification: classifyCapitalGainType(assetType, lot.acquiredDate, t.transactionDate),
      });
      lot.quantity -= consumed;
      remainingToSell -= consumed;
      if (lot.quantity <= 1e-9) openLots.shift();
    }
  }

  return events;
}

/** The current Indian financial year (1 April – 31 March) as of `today`. */
export function currentIndianFinancialYear(today: string): { start: string; end: string; label: string } {
  const d = new Date(today);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
    label: `FY ${startYear}-${String(startYear + 1).slice(2)}`,
  };
}
