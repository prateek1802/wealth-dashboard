import { describe, it, expect } from "vitest";
import { calculateFDMaturityAmount, calculateFDExpectedInterest, calculateFDValueAsOf } from "@/lib/calculations/fd";

describe("calculateFDMaturityAmount", () => {
  it("compounds quarterly for a cumulative FD", () => {
    // 300000 at 7.1% for 2 years, quarterly compounding.
    expect(calculateFDMaturityAmount(300_000, 7.1, 24, "cumulative")).toBeCloseTo(345_342.59, 1);
  });

  it("returns bare principal for non-cumulative payout types", () => {
    expect(calculateFDMaturityAmount(300_000, 7.1, 24, "monthly")).toBe(300_000);
    expect(calculateFDMaturityAmount(300_000, 7.1, 24, "quarterly")).toBe(300_000);
    expect(calculateFDMaturityAmount(300_000, 7.1, 24, "annual")).toBe(300_000);
  });
});

describe("calculateFDExpectedInterest", () => {
  it("is maturity amount minus principal for cumulative FDs", () => {
    expect(calculateFDExpectedInterest(300_000, 7.1, 24, "cumulative")).toBeCloseTo(45_342.59, 1);
  });

  it("uses simple interest for periodic-payout FDs", () => {
    // 300000 * 7.1% * 2 years = 42,600
    expect(calculateFDExpectedInterest(300_000, 7.1, 24, "monthly")).toBeCloseTo(42_600, 1);
  });
});

describe("calculateFDValueAsOf", () => {
  const fd = {
    principal: 300_000,
    interestRate: 7.1,
    startDate: "2024-01-01",
    maturityDate: "2026-01-01",
    payoutType: "cumulative" as const,
    status: "active" as const,
    withdrawalDate: null,
  };

  it("is 0 before the FD started", () => {
    expect(calculateFDValueAsOf(fd, "2023-06-01")).toBe(0);
  });

  it("accrues quarterly-compounded value partway through the tenure", () => {
    expect(calculateFDValueAsOf(fd, "2025-01-01")).toBeCloseTo(321_920.37, 1);
  });

  it("stops compounding at maturity even if still marked active (not yet withdrawn)", () => {
    const atMaturity = calculateFDValueAsOf(fd, "2026-01-01");
    const wellPastMaturity = calculateFDValueAsOf(fd, "2026-06-01");
    expect(wellPastMaturity).toBeCloseTo(atMaturity, 5);
    expect(atMaturity).toBeCloseTo(345_375.86, 1);
  });

  it("is 0 from the withdrawal date onward — the money's presumed moved elsewhere, not double-counted here", () => {
    const withdrawn = { ...fd, status: "withdrawn" as const, withdrawalDate: "2025-06-01" };
    expect(calculateFDValueAsOf(withdrawn, "2025-07-01")).toBe(0);
    expect(calculateFDValueAsOf(withdrawn, "2025-06-01")).toBe(0);
    // Still accrues normally the day before withdrawal.
    expect(calculateFDValueAsOf(withdrawn, "2025-05-31")).toBeCloseTo(331_360.39, 1);
  });

  it("never compounds for non-cumulative payout types — value is flat principal throughout", () => {
    const monthly = { ...fd, payoutType: "monthly" as const };
    expect(calculateFDValueAsOf(monthly, "2025-01-01")).toBe(300_000);
    expect(calculateFDValueAsOf(monthly, "2025-12-31")).toBe(300_000);
  });
});
