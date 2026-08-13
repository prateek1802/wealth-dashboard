import { describe, it, expect } from "vitest";
import { calculatePPFInterestEarned } from "@/lib/calculations/ppf";

describe("calculatePPFInterestEarned", () => {
  it("is the simple difference when nothing has been withdrawn", () => {
    expect(calculatePPFInterestEarned(540_000, 450_000)).toBe(90_000);
  });

  it("adds back withdrawals so past withdrawals don't erase earned interest", () => {
    // Contributed 450k, withdrew 50k along the way, balance now 500k.
    // All-time interest earned = 500k + 50k - 450k = 100k.
    expect(calculatePPFInterestEarned(500_000, 450_000, 50_000)).toBe(100_000);
  });
});
