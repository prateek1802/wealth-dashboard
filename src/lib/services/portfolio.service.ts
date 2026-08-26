import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { snapshotsRepository } from "@/lib/database/repositories/snapshots.repository";
import { fdService } from "./fd.service";
import { npsService } from "./nps.service";
import { ppfService } from "./ppf.service";
import { bankAccountsService } from "./bank-accounts.service";
import { liabilitiesService } from "./liabilities.service";
import { summarizeAssetPosition } from "@/lib/calculations/pnl";
import { calculateAllocation } from "@/lib/calculations/allocation";
import { calculateXIRR } from "@/lib/calculations/returns";
import { netCashFlow } from "@/lib/calculations/cashflow";
import { findHarvestableLots, matchRealizedGainEvents, currentIndianFinancialYear, type HarvestableLot } from "@/lib/calculations/tax-harvesting";
import { todayISO } from "@/lib/utils/date";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";
import { periodToDays } from "@/constants/chart-periods";
import type { ChartPeriod } from "@/constants/chart-periods";
import type { AllocationCategory } from "@/constants/asset-types";
import { ASSET_TYPE_GROUP } from "@/constants/asset-types";
import type { Holding } from "@/types/domain/holding";
import type { Asset } from "@/types/domain/asset";
import type { CalcResult } from "@/lib/calculations/returns";
import type { PortfolioSummary, AllocationSlice, PerformancePoint, ActivityItem } from "@/types/domain/snapshot";

export interface HoldingWithXIRR extends Holding {
  xirr: CalcResult<number>;
  /** Days since the earliest transaction for this asset — used to flag when a projection would be extrapolating a short-term spike over a much longer horizon (see growth-projection.tsx). */
  holdingPeriodDays: number;
}

export interface TaxHarvestingSummary {
  financialYear: { start: string; end: string; label: string };
  harvestableLots: (HarvestableLot & { asset: Asset })[];
  totalShortTermLoss: number;
  totalLongTermLoss: number;
  /** Crypto/VDA unrealized losses — shown for visibility only, NEVER offsettable against anything under Indian law. See tax-harvesting.ts. */
  totalVDALoss: number;
  /** This financial year's realized gains, so harvestable losses can be read against something concrete. */
  realizedSTCG: number;
  realizedLTCG: number;
  realizedVDA: number;
}

/**
 * Portfolio Valuation / Aggregation Service.
 *
 * This is the ONLY module that should be imported by cross-asset-class
 * screens (the dashboard, in particular). It is the seam that unions
 * securities, crypto, cash, fixed deposits, and NPS into one financial
 * picture — no dashboard component talks to `fd.repository` or
 * `nps.repository` directly. See ARCHITECTURE.md section D.
 */

async function computeHoldings(): Promise<Holding[]> {
  const [assets, allTransactions] = await Promise.all([assetsRepository.findAll(), transactionsRepository.findAll()]);

  // "cash" as an asset_type is a legacy V1 path — Bank Accounts (bank-accounts.service.ts)
  // is the intended way to track cash now; any leftover cash-type assets are
  // excluded from holdings here so they're not double-counted.
  const securities = assets.filter((a) => a.assetType !== "cash");
  const holdings: Holding[] = [];

  for (const asset of securities) {
    const txns = allTransactions.filter((t) => t.assetId === asset.id);
    if (txns.length === 0) continue;
    const position = summarizeAssetPosition(txns, asset.currentPrice);
    // Zero-realizedPnl exits are dropped here (nothing useful to show or
    // sum). Positions with realized P&L are KEPT in this shared list so
    // getPortfolioSummary's realized-P&L total below stays accurate even
    // after a full exit — getHoldings()/getTopHoldings()/getHoldingsWithXIRR()
    // filter these out of what's actually DISPLAYED as a holding (see below).
    if (position.quantity <= 1e-9 && position.realizedPnl === 0) continue;
    holdings.push({
      asset,
      quantity: position.quantity,
      weightedAverageCost: position.weightedAverageCost,
      investedAmount: position.investedAmount,
      currentValue: position.currentValue,
      unrealizedPnl: position.unrealizedPnl,
      unrealizedPnlPercent: position.unrealizedPnlPercent,
      realizedPnl: position.realizedPnl,
      allocationPercent: 0,
    });
  }

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  for (const h of holdings) {
    h.allocationPercent = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
  }

  return holdings.sort((a, b) => b.currentValue - a.currentValue);
}

export const portfolioService = {
  async getHoldings(): Promise<Holding[]> {
    const holdings = await computeHoldings();
    return holdings.filter((h) => h.quantity > 1e-9);
  },

  async getTopHoldings(limit: number = 5): Promise<Holding[]> {
    const holdings = await computeHoldings();
    return holdings.filter((h) => h.quantity > 1e-9).slice(0, limit);
  },

  /**
   * Each holding's OWN XIRR — built from just that asset's transaction
   * cash flows, plus its current value as a final "as if sold today"
   * inflow (same pattern as the portfolio-wide XIRR on the dashboard, just
   * scoped to one asset). Powers the per-asset growth projection on the
   * Analytics page. Insufficient data (e.g. a single BUY with no time
   * elapsed) is reported via CalcResult, not hidden or faked as 0%.
   */
  async getHoldingsWithXIRR(): Promise<HoldingWithXIRR[]> {
    const [allHoldings, allTransactions] = await Promise.all([computeHoldings(), transactionsRepository.findAll()]);
    const holdings = allHoldings.filter((h) => h.quantity > 1e-9);
    const today = todayISO();

    return holdings.map((h) => {
      const txns = allTransactions.filter((t) => t.assetId === h.asset.id);
      const cashflows = txns.map((t) => ({ date: t.transactionDate, amount: netCashFlow(t) }));
      cashflows.push({ date: today, amount: h.currentValue });
      const earliestDate = txns.reduce((min, t) => (t.transactionDate < min ? t.transactionDate : min), today);
      const holdingPeriodDays = Math.max(0, (new Date(today).getTime() - new Date(earliestDate).getTime()) / (1000 * 60 * 60 * 24));
      return { ...h, xirr: calculateXIRR(cashflows), holdingPeriodDays };
    });
  },

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const [holdings, cashValue, fdValue, npsValue, ppfValue, liabilitiesValue, snapshots] = await Promise.all([
      computeHoldings(),
      bankAccountsService.totalValue(),
      fdService.totalValue(),
      npsService.currentCorpus(),
      ppfService.totalValue(),
      liabilitiesService.totalOwed(),
      snapshotsRepository.findAll(),
    ]);

    const investedCapital = holdings.reduce((s, h) => s + h.investedAmount, 0);
    const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const realizedPnl = holdings.reduce((s, h) => s + h.realizedPnl, 0);
    const unrealizedPnl = currentValue - investedCapital;
    const unrealizedPnlPercent = investedCapital > 0 ? (unrealizedPnl / investedCapital) * 100 : 0;
    const netWorth = currentValue + cashValue + fdValue + npsValue + ppfValue - liabilitiesValue;

    const today = todayISO();
    // Excludes today's own snapshot — recordTodaysSnapshot() (called by the
    // dashboard right before this) upserts a row for today, so without this
    // filter "previous" ends up being that same just-written row on any
    // page load after the first one today, diffing net worth against
    // itself and showing ~₹0 day change all day.
    const sorted = [...snapshots].filter((s) => s.snapshotDate < today).sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    const previous = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    const dayChange = previous ? netWorth - previous.netWorth : null;
    const dayChangePercent = previous && previous.netWorth > 0 ? ((netWorth - previous.netWorth) / previous.netWorth) * 100 : null;

    return {
      netWorth,
      investedCapital,
      currentValue,
      realizedPnl,
      unrealizedPnl,
      unrealizedPnlPercent,
      cashValue,
      fdValue,
      npsValue,
      ppfValue,
      liabilitiesValue,
      dayChange,
      dayChangePercent,
    };
  },

  async getNetWorth(): Promise<number> {
    const summary = await this.getPortfolioSummary();
    return summary.netWorth;
  },

  async getAssetAllocation(): Promise<AllocationSlice[]> {
    const [holdings, cashValue, fdValue, npsValue, ppfValue] = await Promise.all([
      computeHoldings(),
      bankAccountsService.totalValue(),
      fdService.totalValue(),
      npsService.currentCorpus(),
      ppfService.totalValue(),
    ]);

    const byCategory: Partial<Record<AllocationCategory, number>> = {};
    for (const h of holdings) {
      byCategory[h.asset.assetType] = (byCategory[h.asset.assetType] ?? 0) + h.currentValue;
    }
    if (cashValue > 0) byCategory.cash = (byCategory.cash ?? 0) + cashValue;
    if (fdValue > 0) byCategory.fixed_deposit = fdValue;
    if (npsValue > 0) byCategory.nps = npsValue;
    if (ppfValue > 0) byCategory.ppf = ppfValue;

    return calculateAllocation(byCategory);
  },

  async getPortfolioPerformance(period: ChartPeriod): Promise<PerformancePoint[]> {
    const snapshots = await snapshotsRepository.findAll();
    const days = periodToDays(period);
    const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
    return snapshots
      .filter((s) => !cutoff || new Date(s.snapshotDate).getTime() >= cutoff)
      .map((s) => ({ date: s.snapshotDate, value: s.netWorth }));
  },

  async getRecentActivity(limit: number = 8): Promise<ActivityItem[]> {
    const [transactions, assets] = await Promise.all([transactionsRepository.findRecent(limit), assetsRepository.findAll()]);
    const assetById = new Map(assets.map((a) => [a.id, a]));

    return transactions.map((t) => {
      const asset = assetById.get(t.assetId);
      return {
        id: t.id,
        kind: "transaction" as const,
        label: `${t.transactionType} ${asset ? getAssetDisplayLabel(asset).primary : "—"}`,
        detail: `${t.quantity} units @ ${t.price.toFixed(2)}`,
        amount: t.quantity * t.price,
        date: t.transactionDate,
      };
    });
  },

  /**
   * Dynamic segregated breakdown — Cash / Equity / Debt / NPS / PPF / Crypto
   * / Other — computed live from whatever is currently held. "Debt" folds
   * in Fixed Deposits alongside debt mutual funds/bonds, since FDs are a
   * debt instrument; FD still has its own dedicated tracking page for
   * maturity management. Nothing here is a stored category — relabeling
   * ASSET_TYPE_GROUP in constants/asset-types.ts is the only place this
   * grouping logic lives.
   */
  async getSegregatedBreakdown() {
    const [holdings, cashValue, fdValue, npsValue, ppfValue] = await Promise.all([
      computeHoldings(),
      bankAccountsService.totalValue(),
      fdService.totalValue(),
      npsService.currentCorpus(),
      ppfService.totalValue(),
    ]);

    let equity = 0;
    let debt = fdValue;
    let crypto = 0;
    let other = 0;

    for (const h of holdings) {
      const group = ASSET_TYPE_GROUP[h.asset.assetType];
      if (group === "Equity") equity += h.currentValue;
      else if (group === "Debt") debt += h.currentValue;
      else if (group === "Crypto") crypto += h.currentValue;
      else if (group === "Other") other += h.currentValue;
      // "Cash" is tracked via Bank Accounts, already counted above.
    }

    return { cash: cashValue, equity, debt, nps: npsValue, ppf: ppfValue, crypto, other };
  },

  /**
   * Portfolio-wide tax-loss harvesting summary — see calculations/
   * tax-harvesting.ts for the classification rules and their caveats. Pulls
   * together every open lot currently at an unrealized loss across every
   * security, plus this financial year's realized gains split short/long
   * term, so the two can be read side by side (a loss is only useful to
   * harvest if there's a gain of a compatible type to offset it against).
   */
  async getTaxHarvestingSummary(): Promise<TaxHarvestingSummary> {
    const [assets, allTransactions] = await Promise.all([assetsRepository.findAll(), transactionsRepository.findAll()]);
    const today = todayISO();
    const fy = currentIndianFinancialYear(today);

    const harvestableLots: (HarvestableLot & { asset: Asset })[] = [];
    let realizedSTCG = 0;
    let realizedLTCG = 0;
    let realizedVDA = 0;

    for (const asset of assets) {
      const assetTransactions = allTransactions.filter((t) => t.assetId === asset.id);
      if (assetTransactions.length === 0) continue;

      for (const lot of findHarvestableLots(asset.id, asset.assetType, assetTransactions, asset.currentPrice, today)) {
        harvestableLots.push({ ...lot, asset });
      }

      for (const event of matchRealizedGainEvents(asset.assetType, assetTransactions)) {
        if (event.sellDate < fy.start || event.sellDate > fy.end) continue;
        if (event.classification === "short_term") realizedSTCG += event.gain;
        else if (event.classification === "long_term") realizedLTCG += event.gain;
        else if (event.classification === "flat_rate_vda") realizedVDA += event.gain;
        // "unsupported" (bonds): deliberately excluded from these totals — see tax-harvesting.ts.
      }
    }

    harvestableLots.sort((a, b) => b.lossAmount - a.lossAmount);

    const totalShortTermLoss = harvestableLots.filter((l) => l.classification === "short_term").reduce((s, l) => s + l.lossAmount, 0);
    const totalLongTermLoss = harvestableLots.filter((l) => l.classification === "long_term").reduce((s, l) => s + l.lossAmount, 0);
    const totalVDALoss = harvestableLots.filter((l) => l.classification === "flat_rate_vda").reduce((s, l) => s + l.lossAmount, 0);

    return {
      financialYear: fy,
      harvestableLots,
      totalShortTermLoss,
      totalLongTermLoss,
      totalVDALoss,
      realizedSTCG,
      realizedLTCG,
      realizedVDA,
    };
  },
};
