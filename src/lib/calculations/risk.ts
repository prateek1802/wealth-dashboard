import type { CalcResult } from "./returns";

const MIN_SNAPSHOTS_FOR_RISK = 8;

/**
 * A single snapshot-to-snapshot return this large is implausible for a real
 * diversified portfolio's actual move — this project's NPS corpus
 * calculation changed methodology multiple times over its history (a
 * corpus-doubling bug, a contribution-sync bug, a later switch to derived
 * units×NAV), and a snapshot recorded mid-transition between those can show
 * an artificial 30-50%+ net worth swing that was never a real market move.
 * With only MIN_SNAPSHOTS_FOR_RISK snapshots required, one such point is
 * enough to blow Volatility/Sharpe/Sortino into implausible values (>500).
 * This is the second, cutoff-independent line of defense — see
 * RISK_METRICS_CUTOFF_DATE in constants/risk.ts for the first.
 */
const OUTLIER_RETURN_THRESHOLD = 0.3; // ±30% in a single gap

function periodicReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] === 0) continue;
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  return returns;
}

/** Drops any single period-to-period return whose magnitude exceeds OUTLIER_RETURN_THRESHOLD. See that constant's doc comment for why. */
function excludeOutlierReturns(returns: number[]): number[] {
  return returns.filter((r) => Math.abs(r) <= OUTLIER_RETURN_THRESHOLD);
}

/**
 * Drops values/dates before cutoffDate. Pure, no I/O. Passing "" (the
 * default on every risk.ts function below) is a no-op — every ISO date
 * string is >= "" — so existing callers that don't pass a cutoff see
 * unchanged behavior; only the Analytics page passes the real
 * RISK_METRICS_CUTOFF_DATE.
 */
function filterFromCutoff(values: number[], dates: string[], cutoffDate: string): { values: number[]; dates: string[] } {
  const filteredValues: number[] = [];
  const filteredDates: string[] = [];
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= cutoffDate) {
      filteredValues.push(values[i]);
      filteredDates.push(dates[i]);
    }
  }
  return { values: filteredValues, dates: filteredDates };
}

/**
 * How many "periods" (at the observed snapshot cadence) make up a year,
 * derived from the ACTUAL average gap between consecutive snapshot dates —
 * not assumed to be daily.
 *
 * Snapshots here are written opportunistically (whenever the dashboard is
 * opened, at most once per day via upsertToday), not on a fixed daily
 * cadence — real gaps are irregular and often several days. A hardcoded
 * Math.sqrt(252) (correct only for a true daily trading-return series)
 * would treat each multi-day move as if it were a single day's move and
 * scale it up as if 252 of those happened in a year, inflating volatility
 * and any ratio built on it. This uses calendar days (365), not trading
 * days (252), since snapshot gaps aren't bounded to market-open days.
 *
 * Still an approximation, not a rigorous fix: this applies ONE blanket
 * factor derived from the average gap to every return, rather than
 * time-weighting each individual return by its own actual gap. Fine for a
 * personal dashboard's directional read; not something to treat as a
 * precise, trading-desk-grade risk metric. The UI should caption these as
 * approximate.
 */
function periodsPerYear(dates: string[]): number {
  if (dates.length < 2) return 365; // shouldn't be reachable given MIN_SNAPSHOTS_FOR_RISK, but never divide by zero
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const days = (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0) gaps.push(days);
  }
  if (gaps.length === 0) return 365;
  const avgIntervalDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  return 365 / avgIntervalDays;
}

export function calculateVolatility(values: number[], dates: string[], cutoffDate: string = ""): CalcResult<number> {
  const filtered = filterFromCutoff(values, dates, cutoffDate);
  if (filtered.values.length < MIN_SNAPSHOTS_FOR_RISK) {
    return { status: "insufficient_data", reason: `Need at least ${MIN_SNAPSHOTS_FOR_RISK} snapshots${cutoffDate ? " on or after the configured cutoff date" : ""} to estimate volatility.` };
  }
  const returns = excludeOutlierReturns(periodicReturns(filtered.values));
  if (returns.length < 2) {
    return { status: "insufficient_data", reason: "Not enough stable (non-outlier) periods to estimate volatility." };
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return { status: "ok", value: Math.sqrt(variance) * Math.sqrt(periodsPerYear(filtered.dates)) * 100 };
}

export function calculateMaxDrawdown(values: number[]): CalcResult<number> {
  if (values.length < 2) {
    return { status: "insufficient_data", reason: "Need at least two snapshots to compute drawdown." };
  }
  let peak = values[0];
  let maxDrawdown = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const drawdown = (peak - v) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }
  return { status: "ok", value: maxDrawdown * 100 };
}

export function calculateSharpeRatio(values: number[], dates: string[], riskFreeRateAnnual: number, cutoffDate: string = ""): CalcResult<number> {
  const filtered = filterFromCutoff(values, dates, cutoffDate);
  if (filtered.values.length < MIN_SNAPSHOTS_FOR_RISK) {
    return { status: "insufficient_data", reason: `Need at least ${MIN_SNAPSHOTS_FOR_RISK} snapshots${cutoffDate ? " on or after the configured cutoff date" : ""} to estimate Sharpe ratio.` };
  }
  const returns = excludeOutlierReturns(periodicReturns(filtered.values));
  if (returns.length < 2) {
    return { status: "insufficient_data", reason: "Not enough stable (non-outlier) periods to estimate Sharpe ratio." };
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return { status: "insufficient_data", reason: "No volatility observed yet." };
  const perYear = periodsPerYear(filtered.dates);
  const periodicRiskFree = riskFreeRateAnnual / 100 / perYear;
  return { status: "ok", value: ((mean - periodicRiskFree) / stdDev) * Math.sqrt(perYear) };
}

export function calculateSortinoRatio(values: number[], dates: string[], riskFreeRateAnnual: number, cutoffDate: string = ""): CalcResult<number> {
  const filtered = filterFromCutoff(values, dates, cutoffDate);
  if (filtered.values.length < MIN_SNAPSHOTS_FOR_RISK) {
    return { status: "insufficient_data", reason: `Need at least ${MIN_SNAPSHOTS_FOR_RISK} snapshots${cutoffDate ? " on or after the configured cutoff date" : ""} to estimate Sortino ratio.` };
  }
  const perYear = periodsPerYear(filtered.dates);
  const periodicRiskFree = riskFreeRateAnnual / 100 / perYear;
  const returns = excludeOutlierReturns(periodicReturns(filtered.values));
  if (returns.length < 2) {
    return { status: "insufficient_data", reason: "Not enough stable (non-outlier) periods to estimate Sortino ratio." };
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const downside = returns.filter((r) => r < periodicRiskFree);
  if (downside.length === 0) return { status: "insufficient_data", reason: "No downside periods observed yet." };
  const downsideVariance = downside.reduce((s, r) => s + (r - periodicRiskFree) ** 2, 0) / downside.length;
  const downsideDev = Math.sqrt(downsideVariance);
  if (downsideDev === 0) return { status: "insufficient_data", reason: "No downside volatility observed yet." };
  return { status: "ok", value: ((mean - periodicRiskFree) / downsideDev) * Math.sqrt(perYear) };
}
