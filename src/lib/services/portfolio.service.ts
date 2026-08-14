import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { snapshotsRepository } from "@/lib/database/repositories/snapshots.repository";
import { fdService } from "./fd.service";
import { npsService } from "./nps.service";
import { ppfService } from "./ppf.service";
import { bankAccountsService } from "./bank-accounts.service";
import { summarizeAssetPosition } from "@/lib/calculations/pnl";
import { calculateAllocation } from "@/lib/calculations/allocation";
import { calculateXIRR } from "@/lib/calculations/returns";
import { netCashFlow } from "@/lib/calculations/cashflow";
import { todayISO } from "@/lib/utils/date";
import { periodToDays } from "@/constants/chart-periods";
import type { ChartPeriod } from "@/constants/chart-periods";
import type { AllocationCategory } from "@/constants/asset-types";
import { ASSET_TYPE_GROUP } from "@/constants/asset-types";
import type { Holding } from "@/types/domain/holding";
import type { CalcResult } from "@/lib/calculations/returns";
import type { PortfolioSummary, AllocationSlice, PerformancePoint, ActivityItem } from "@/types/domain/snapshot";

export interface HoldingWithXIRR extends Holding {
  xirr: CalcResult<number>;
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
    if (position.quantity <= 1e-9 && position.realizedPnl === 0) continue; // fully exited, nothing to show
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
    return computeHoldings();
  },

  async getTopHoldings(limit: number = 5): Promise<Holding[]> {
    const holdings = await computeHoldings();
    return holdings.slice(0, limit);
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
    const [holdings, allTransactions] = await Promise.all([computeHoldings(), transactionsRepository.findAll()]);
    const today = todayISO();

    return holdings.map((h) => {
      const txns = allTransactions.filter((t) => t.assetId === h.asset.id);
      const cashflows = txns.map((t) => ({ date: t.transactionDate, amount: netCashFlow(t) }));
      cashflows.push({ date: today, amount: h.currentValue });
      return { ...h, xirr: calculateXIRR(cashflows) };
    });
  },

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const [holdings, cashValue, fdValue, npsValue, ppfValue, snapshots] = await Promise.all([
      computeHoldings(),
      bankAccountsService.totalValue(),
      fdService.totalValue(),
      npsService.currentCorpus(),
      ppfService.totalValue(),
      snapshotsRepository.findAll(),
    ]);

    const investedCapital = holdings.reduce((s, h) => s + h.investedAmount, 0);
    const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const realizedPnl = holdings.reduce((s, h) => s + h.realizedPnl, 0);
    const unrealizedPnl = currentValue - investedCapital;
    const unrealizedPnlPercent = investedCapital > 0 ? (unrealizedPnl / investedCapital) * 100 : 0;
    const netWorth = currentValue + cashValue + fdValue + npsValue + ppfValue;

    const sorted = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
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
        label: `${t.transactionType} ${asset?.symbol ?? "—"}`,
        detail: `${t.quantity} units @ ${t.price}`,
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
};
