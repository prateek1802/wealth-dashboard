export type CalcResult<T> =
  | { status: "ok"; value: T }
  | { status: "insufficient_data"; reason: string };

export interface Cashflow {
  date: string; // ISO date
  amount: number; // negative = outflow, positive = inflow
}

/**
 * Compound annual growth rate between two point values.
 * Requires years > 0 and beginValue > 0.
 */
export function calculateCAGR(beginValue: number, endValue: number, years: number): CalcResult<number> {
  if (years <= 0 || beginValue <= 0) {
    return { status: "insufficient_data", reason: "Need a positive starting value and a positive time span." };
  }
  const cagr = (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
  return { status: "ok", value: cagr };
}

/**
 * XIRR via Newton-Raphson on irregular cash flows. Needs at least one
 * negative and one positive flow to be solvable.
 */
export function calculateXIRR(cashflows: Cashflow[]): CalcResult<number> {
  if (cashflows.length < 2) {
    return { status: "insufficient_data", reason: "Need at least two cash flows to compute XIRR." };
  }
  const hasNegative = cashflows.some((c) => c.amount < 0);
  const hasPositive = cashflows.some((c) => c.amount > 0);
  if (!hasNegative || !hasPositive) {
    return { status: "insufficient_data", reason: "Need both an outflow and an inflow to compute XIRR." };
  }

  const t0 = new Date(cashflows[0].date).getTime();
  const years = cashflows.map((c) => (new Date(c.date).getTime() - t0) / (365 * 24 * 60 * 60 * 1000));

  const npv = (rate: number) =>
    cashflows.reduce((sum, c, i) => sum + c.amount / Math.pow(1 + rate, years[i]), 0);
  const dNpv = (rate: number) =>
    cashflows.reduce((sum, c, i) => sum - (years[i] * c.amount) / Math.pow(1 + rate, years[i] + 1), 0);

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    const derivative = dNpv(rate);
    if (Math.abs(derivative) < 1e-12) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-8) {
      rate = next;
      break;
    }
    rate = next;
  }

  if (!Number.isFinite(rate) || rate < -0.999) {
    return { status: "insufficient_data", reason: "XIRR did not converge for this cash-flow pattern." };
  }

  return { status: "ok", value: rate * 100 };
}
