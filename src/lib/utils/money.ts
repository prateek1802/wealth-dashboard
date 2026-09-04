import Decimal from "decimal.js";

/**
 * Plain JS `number` arithmetic on money is used throughout this codebase's
 * existing calculations (pnl.ts, returns.ts, holdings.ts, cashflow.ts,
 * tax-harvesting.ts, fd.ts, ppf.ts, risk.ts, allocation.ts, nps.ts) and
 * that's DELIBERATELY left untouched here — low risk at current
 * transaction volume, and retrofitting every existing calculation carries
 * real risk of subtly shifting already-correct, already-tested numbers for
 * a problem that isn't currently causing visible symptoms. This module is
 * for adoption GOING FORWARD: new money-arithmetic code, especially
 * anything that chains many additions/subtractions (where floating-point
 * drift compounds — e.g. `0.1 + 0.2 !== 0.3` in plain JS), should reach
 * for these instead of raw `+`/`-`/`*`/`/`.
 *
 * Every function takes and returns plain `number` — Decimal.js is used
 * only as the calculation's internal engine, so these drop into existing
 * `number`-typed fields/APIs with no wider type migration required.
 *
 * Rounds to `precision` decimal places (default 2, ordinary currency
 * precision) using round-half-up, matching how money is conventionally
 * rounded (vs. JS's own floating-point-unsafe `Math.round`).
 */

export function addMoney(a: number, b: number): number {
  return new Decimal(a).plus(b).toNumber();
}

export function subtractMoney(a: number, b: number): number {
  return new Decimal(a).minus(b).toNumber();
}

export function multiplyMoney(a: number, b: number): number {
  return new Decimal(a).times(b).toNumber();
}

/** Returns Infinity/-Infinity on division by zero, matching plain JS `/` — same as `10/0` — rather than throwing. Callers who need to treat that as an error should check the divisor first. */
export function divideMoney(a: number, b: number): number {
  return new Decimal(a).dividedBy(b).toNumber();
}

/** Sums an array in one pass — avoids accumulating drift across N separate addMoney() calls in a reduce. */
export function sumMoney(values: number[]): number {
  return values.reduce((sum, v) => sum.plus(v), new Decimal(0)).toNumber();
}

export function roundMoney(value: number, precision: number = 2): number {
  return new Decimal(value).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
}
