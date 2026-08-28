/**
 * Snapshots dated before this are excluded from Volatility, Sharpe Ratio,
 * and Sortino Ratio (NOT Max Drawdown — peak-to-trough, much less sensitive
 * to a single bad point, and not part of the bug this fixes).
 *
 * This project's NPS corpus calculation changed methodology multiple times
 * (a corpus-doubling bug, a contribution-sync bug, a later switch to
 * derived units×NAV) — a portfolio_snapshots row recorded mid-transition
 * between any of those can show an artificial 30-50%+ net worth swing that
 * was never a real market move. With only ~8 snapshots required for these
 * metrics, one such point was enough to blow Volatility/Sharpe/Sortino into
 * implausible values (>500).
 *
 * Defaults to today's date as a placeholder — meaning NO historical
 * snapshot currently qualifies until you change this. That's deliberate:
 * only you know which of your own snapshots predate your NPS methodology
 * fully stabilizing. Set this to the earliest date you're confident every
 * snapshot from then on reflects the FINAL corpus logic (no further
 * corpus-doubling / contribution-sync / switch-to-derived-units transitions
 * after that date) — e.g. "2025-06-01".
 *
 * This is one of two independent safeguards — calculateVolatility() /
 * calculateSharpeRatio() / calculateSortinoRatio() in calculations/risk.ts
 * also drop any single period-to-period return over ±30% regardless of
 * this cutoff, so a stray bad point already before this date is set is
 * still caught.
 */
export const RISK_METRICS_CUTOFF_DATE = "2026-08-28";
