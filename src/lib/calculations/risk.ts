import type { CalcResult } from "./returns";

const MIN_SNAPSHOTS_FOR_RISK = 8;

function periodicReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] === 0) continue;
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  return returns;
}

export function calculateVolatility(values: number[]): CalcResult<number> {
  if (values.length < MIN_SNAPSHOTS_FOR_RISK) {
    return { status: "insufficient_data", reason: `Need at least ${MIN_SNAPSHOTS_FOR_RISK} snapshots to estimate volatility.` };
  }
  const returns = periodicReturns(values);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return { status: "ok", value: Math.sqrt(variance) * 100 };
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

export function calculateSharpeRatio(values: number[], riskFreeRateAnnual: number): CalcResult<number> {
  if (values.length < MIN_SNAPSHOTS_FOR_RISK) {
    return { status: "insufficient_data", reason: `Need at least ${MIN_SNAPSHOTS_FOR_RISK} snapshots to estimate Sharpe ratio.` };
  }
  const returns = periodicReturns(values);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return { status: "insufficient_data", reason: "No volatility observed yet." };
  const periodicRiskFree = riskFreeRateAnnual / 100 / 252;
  return { status: "ok", value: ((mean - periodicRiskFree) / stdDev) * Math.sqrt(252) };
}

export function calculateSortinoRatio(values: number[], riskFreeRateAnnual: number): CalcResult<number> {
  if (values.length < MIN_SNAPSHOTS_FOR_RISK) {
    return { status: "insufficient_data", reason: `Need at least ${MIN_SNAPSHOTS_FOR_RISK} snapshots to estimate Sortino ratio.` };
  }
  const returns = periodicReturns(values);
  const periodicRiskFree = riskFreeRateAnnual / 100 / 252;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const downside = returns.filter((r) => r < periodicRiskFree);
  if (downside.length === 0) return { status: "insufficient_data", reason: "No downside periods observed yet." };
  const downsideVariance = downside.reduce((s, r) => s + (r - periodicRiskFree) ** 2, 0) / downside.length;
  const downsideDev = Math.sqrt(downsideVariance);
  if (downsideDev === 0) return { status: "insufficient_data", reason: "No downside volatility observed yet." };
  return { status: "ok", value: ((mean - periodicRiskFree) / downsideDev) * Math.sqrt(252) };
}
