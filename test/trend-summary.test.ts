import { describe, it, expect } from "vitest";
import { calculateTrendSummary } from "@/lib/calculations/trend-summary";

describe("calculateTrendSummary", () => {
  it("computes change from first to last point, ignoring points in between", () => {
    const result = calculateTrendSummary([{ value: 100 }, { value: 999 }, { value: 150 }]);
    expect(result).toEqual({ changeAmount: 50, changePercent: 50, isUp: true });
  });

  it("flags a decrease as isUp: false with a negative changeAmount", () => {
    const result = calculateTrendSummary([{ value: 200 }, { value: 150 }]);
    expect(result).toEqual({ changeAmount: -50, changePercent: -25, isUp: false });
  });

  it("treats zero change as isUp: true (not down)", () => {
    const result = calculateTrendSummary([{ value: 100 }, { value: 100 }]);
    expect(result?.isUp).toBe(true);
    expect(result?.changeAmount).toBe(0);
  });

  it("returns null changePercent when the first value is 0, rather than Infinity or NaN", () => {
    const result = calculateTrendSummary([{ value: 0 }, { value: 500 }]);
    expect(result?.changePercent).toBeNull();
    expect(result?.changeAmount).toBe(500);
  });

  it("returns null for fewer than 2 points", () => {
    expect(calculateTrendSummary([])).toBeNull();
    expect(calculateTrendSummary([{ value: 100 }])).toBeNull();
  });
});
