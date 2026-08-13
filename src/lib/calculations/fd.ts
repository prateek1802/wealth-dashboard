import type { FDPayoutType } from "@/constants/asset-types";

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
