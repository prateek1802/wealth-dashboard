import { describe, it, expect } from "vitest";
import { calculateCAGR, calculateXIRR, projectFutureValue } from "@/lib/calculations/returns";

describe("calculateCAGR", () => {
  it("computes CAGR for doubling over 3 years", () => {
    const result = calculateCAGR(1000, 2000, 3);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value).toBeCloseTo(25.99, 1);
    }
  });

  it("reports insufficient_data for zero years", () => {
    const result = calculateCAGR(1000, 2000, 0);
    expect(result.status).toBe("insufficient_data");
  });
});

describe("calculateXIRR", () => {
  it("computes a reasonable rate for a simple buy-then-sell", () => {
    const result = calculateXIRR([
      { date: "2023-01-01", amount: -1000 },
      { date: "2024-01-01", amount: 1100 },
    ]);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value).toBeCloseTo(10, 0);
    }
  });

  it("reports insufficient_data with a single cash flow", () => {
    const result = calculateXIRR([{ date: "2023-01-01", amount: -1000 }]);
    expect(result.status).toBe("insufficient_data");
  });

  it("reports insufficient_data when all flows are the same sign", () => {
    const result = calculateXIRR([
      { date: "2023-01-01", amount: -1000 },
      { date: "2023-06-01", amount: -500 },
    ]);
    expect(result.status).toBe("insufficient_data");
  });
});

describe("projectFutureValue", () => {
  it("compounds a value forward at a fixed rate", () => {
    // 100,000 at 10% for 3 years = 100000 * 1.1^3 = 133,100
    expect(projectFutureValue(100_000, 10, 3)).toBeCloseTo(133_100, 0);
  });

  it("returns the current value unchanged for zero or negative years", () => {
    expect(projectFutureValue(50_000, 12, 0)).toBe(50_000);
    expect(projectFutureValue(50_000, 12, -1)).toBe(50_000);
  });

  it("handles a negative rate (declining value)", () => {
    expect(projectFutureValue(100_000, -10, 1)).toBeCloseTo(90_000, 0);
  });
});
