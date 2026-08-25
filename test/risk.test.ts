import { describe, it, expect } from "vitest";
import { calculateVolatility, calculateMaxDrawdown, calculateSharpeRatio, calculateSortinoRatio } from "@/lib/calculations/risk";

// A steady ~1% net worth increase every snapshot, but snapshots are spaced
// 7 CALENDAR DAYS apart, not daily — the exact "opportunistic snapshot"
// scenario this fix addresses. If annualization wrongly assumed daily
// spacing (Math.sqrt(252)), it would scale this weekly-cadence volatility
// as if 252 of these periods happened in a year, when only ~52 actually
// would (365/7) — inflating the annualized figure by roughly sqrt(252/52),
// a factor of ~2.2x.
function weeklyDates(count: number): string[] {
  const dates: string[] = [];
  const start = new Date("2024-01-01T00:00:00.000Z");
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function noisyValues(count: number, base = 1_000_000): number[] {
  // Alternating small up/down moves so there's real variance to annualize,
  // deterministic so the test is reproducible.
  const values: number[] = [base];
  for (let i = 1; i < count; i++) {
    const pctMove = i % 2 === 0 ? 0.01 : -0.004;
    values.push(values[i - 1] * (1 + pctMove));
  }
  return values;
}

describe("calculateVolatility — annualization factor derived from actual snapshot gaps", () => {
  it("produces a materially SMALLER annualized figure for weekly-spaced snapshots than the old hardcoded Math.sqrt(252) approach would have", () => {
    const values = noisyValues(10);
    const dates = weeklyDates(10);

    const result = calculateVolatility(values, dates);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    // Reconstruct what the OLD buggy implementation would have produced —
    // same variance math, but always scaling by sqrt(252) regardless of
    // actual spacing.
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) returns.push((values[i] - values[i - 1]) / values[i - 1]);
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
    const oldBuggyValue = Math.sqrt(variance) * Math.sqrt(252) * 100;

    // Weekly cadence -> ~52 periods/year, not 252 -> should be meaningfully lower.
    expect(result.value).toBeLessThan(oldBuggyValue * 0.6);
  });

  it("produces a LOWER annualized figure for monthly-spaced snapshots than for weekly-spaced snapshots with the same per-period volatility", () => {
    const values = noisyValues(10);
    const weekly = calculateVolatility(values, weeklyDates(10));

    const monthlyDates: string[] = [];
    const start = new Date("2024-01-01T00:00:00.000Z");
    for (let i = 0; i < 10; i++) monthlyDates.push(new Date(start.getTime() + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const monthly = calculateVolatility(values, monthlyDates);

    expect(weekly.status).toBe("ok");
    expect(monthly.status).toBe("ok");
    if (weekly.status !== "ok" || monthly.status !== "ok") return;

    // Same per-period returns, but weekly implies ~52 periods/year (365/7)
    // vs monthly's ~12 (365/30) — far more periods to compound into an
    // annual figure, so weekly's annualized volatility is larger.
    expect(monthly.value).toBeLessThan(weekly.value);
  });

  it("still requires the minimum snapshot count regardless of spacing", () => {
    const result = calculateVolatility([1, 2, 3], ["2024-01-01", "2024-01-08", "2024-01-15"]);
    expect(result.status).toBe("insufficient_data");
  });
});

describe("calculateSharpeRatio / calculateSortinoRatio — same interval-aware annualization", () => {
  it("both annualize using the derived periods-per-year rather than a hardcoded 252", () => {
    const values = noisyValues(10);
    const dates = weeklyDates(10);

    const sharpe = calculateSharpeRatio(values, dates, 7);
    const sortino = calculateSortinoRatio(values, dates, 7);

    expect(sharpe.status).toBe("ok");
    expect(sortino.status).toBe("ok");
    // Just confirms both compute without the old signature (values, riskFreeRate) —
    // the actual scaling correctness is covered by the volatility tests above,
    // since all three share the same periodsPerYear() derivation.
  });
});

describe("calculateMaxDrawdown — unaffected by the annualization fix (not a rate, no date input needed)", () => {
  it("computes peak-to-trough drawdown regardless of spacing", () => {
    const result = calculateMaxDrawdown([100, 120, 90, 110]);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.value).toBeCloseTo(25, 5); // (120-90)/120
  });
});
