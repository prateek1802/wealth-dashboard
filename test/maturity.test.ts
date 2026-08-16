import { describe, it, expect } from "vitest";
import { calculateDaysUntil, calculatePPFMaturityDate } from "@/lib/calculations/maturity";

describe("calculateDaysUntil", () => {
  it("is positive for a future date", () => {
    const asOf = new Date("2026-01-01");
    expect(calculateDaysUntil("2026-01-11", asOf)).toBe(10);
  });

  it("is negative for a past date", () => {
    const asOf = new Date("2026-01-11");
    expect(calculateDaysUntil("2026-01-01", asOf)).toBe(-10);
  });
});

describe("calculatePPFMaturityDate", () => {
  it("adds exactly 15 years to the open date", () => {
    expect(calculatePPFMaturityDate("2020-04-01")).toBe("2035-04-01");
  });
});
