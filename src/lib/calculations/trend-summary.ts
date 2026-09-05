export interface TrendSummary {
  changeAmount: number;
  /** null when the period's first value is 0 — a % change is undefined, not zero. */
  changePercent: number | null;
  isUp: boolean;
}

/**
 * First vs. last point of whatever period's series is currently selected —
 * feeds the plain-language summary line above the Analytics trend chart
 * (e.g. "Up ₹42,000 (+2.1%) over the last 3 months"). Not a separate
 * metric or calculation of its own, just a readable framing of the same
 * net-worth series already being charted.
 */
export function calculateTrendSummary(points: { value: number }[]): TrendSummary | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const changeAmount = last - first;
  const changePercent = first !== 0 ? (changeAmount / first) * 100 : null;
  return { changeAmount, changePercent, isUp: changeAmount >= 0 };
}
