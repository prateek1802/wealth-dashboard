import type { FDPayoutType } from "@/constants/asset-types";
import type { FixedDeposit } from "@/types/domain/fixed-deposit";

/**
 * Maturity amount for a cumulative FD (quarterly-compounded, the common
 * convention for Indian bank FDs). For non-cumulative payout types the
 * maturity amount equals the principal (interest is paid out periodically,
 * not compounded into the maturity value) — this function still returns
 * the principal in that case so callers can rely on it unconditionally.
 */
export function calculateFDMaturityAmount(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  payoutType: FDPayoutType
): number {
  if (payoutType !== "cumulative") {
    return principal;
  }
  const r = annualRatePercent / 100;
  const years = tenureMonths / 12;
  const compoundingPeriodsPerYear = 4; // quarterly
  return principal * Math.pow(1 + r / compoundingPeriodsPerYear, compoundingPeriodsPerYear * years);
}

export function calculateFDDaysRemaining(maturityDate: string, asOf: Date = new Date()): number {
  const maturity = new Date(maturityDate);
  const diffMs = maturity.getTime() - asOf.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateFDExpectedInterest(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  payoutType: FDPayoutType
): number {
  if (payoutType === "cumulative") {
    return calculateFDMaturityAmount(principal, annualRatePercent, tenureMonths, payoutType) - principal;
  }
  // Simple interest for periodic-payout FDs: principal * rate * time.
  return principal * (annualRatePercent / 100) * (tenureMonths / 12);
}

/**
 * True accrued value on an arbitrary past (or present) date — for
 * reconstructing historical net worth (see PROJECT-STATUS.md's "real
 * transaction dates, not snapshot dates" performance-graph work), NOT for
 * the live Dashboard/FD-page total. Deliberately a SEPARATE notion of
 * "value" from fdService.totalValue(), which uses flat principal for every
 * active FD (see that function's own comment calling accrued-interest a
 * "V2 refinement") — this IS that V2 refinement, but scoped to historical
 * reconstruction only, not swapped in for the live total. That means the
 * graph's own "today" point (computed via this function) will read
 * slightly HIGHER than the flat-principal number shown elsewhere in the
 * app for the same FD on the same day — a real, visible inconsistency
 * between two now-coexisting definitions of "FD value," not a bug in
 * either one individually. Worth deciding later whether fdService should
 * adopt this same accrual instead, but that's a separate decision — not
 * bundled into this graph-accuracy work.
 *
 * Before the FD started: 0. After withdrawal: 0 from the withdrawal date
 * onward (the money's presumed moved elsewhere, typically a Bank Account —
 * see the withdrawal dialog's own note — so counting it here would double
 * it). Non-cumulative payout types never compound into value (matches
 * calculateFDMaturityAmount's convention) — value is just principal
 * throughout, since interest is paid out, not accumulated.
 */
export function calculateFDValueAsOf(
  fd: Pick<FixedDeposit, "principal" | "interestRate" | "startDate" | "maturityDate" | "payoutType" | "status" | "withdrawalDate">,
  date: string
): number {
  if (date < fd.startDate) return 0;
  if (fd.status === "withdrawn" && fd.withdrawalDate !== null && date >= fd.withdrawalDate) return 0;
  if (fd.payoutType !== "cumulative") return fd.principal;

  // Compounding stops at maturity even if the FD hasn't been formally
  // withdrawn yet (e.g. matured last month, withdrawal not logged) —
  // otherwise this would keep compounding indefinitely past maturity,
  // which no real FD does.
  const effectiveDate = date < fd.maturityDate ? date : fd.maturityDate;
  const elapsedDays = (new Date(effectiveDate).getTime() - new Date(fd.startDate).getTime()) / 86_400_000;
  const years = elapsedDays / 365.25;
  const r = fd.interestRate / 100;
  const compoundingPeriodsPerYear = 4; // quarterly — matches calculateFDMaturityAmount
  return fd.principal * Math.pow(1 + r / compoundingPeriodsPerYear, compoundingPeriodsPerYear * years);
}
