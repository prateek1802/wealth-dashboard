import { describe, it, expect } from "vitest";
import { addMoney, subtractMoney, multiplyMoney, divideMoney, sumMoney, roundMoney } from "@/lib/utils/money";

describe("addMoney", () => {
  it("avoids the classic floating-point drift that plain JS addition has", () => {
    // Plain JS: 0.1 + 0.2 === 0.30000000000000004, not 0.3.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it("adds ordinary values correctly", () => {
    expect(addMoney(1000.5, 250.25)).toBe(1250.75);
  });
});

describe("subtractMoney", () => {
  it("avoids drift on subtraction", () => {
    expect(subtractMoney(0.3, 0.1)).toBe(0.2);
  });
});

describe("multiplyMoney", () => {
  it("avoids drift on multiplication", () => {
    // Plain JS: 1.005 * 100 === 100.49999999999999, not 100.5.
    expect(1.005 * 100).not.toBe(100.5);
    expect(multiplyMoney(1.005, 100)).toBe(100.5);
  });
});

describe("divideMoney", () => {
  it("divides correctly", () => {
    expect(divideMoney(10, 4)).toBe(2.5);
  });

  it("returns Infinity on division by zero, matching plain JS `/` rather than throwing", () => {
    expect(divideMoney(10, 0)).toBe(Infinity);
  });
});

describe("sumMoney", () => {
  it("sums an array without accumulating drift across many additions", () => {
    const values = Array(10).fill(0.1);
    expect(values.reduce((a, b) => a + b, 0)).not.toBe(1); // plain JS drifts here
    expect(sumMoney(values)).toBe(1);
  });

  it("returns 0 for an empty array", () => {
    expect(sumMoney([])).toBe(0);
  });
});

describe("roundMoney", () => {
  it("rounds to 2 decimal places by default", () => {
    expect(roundMoney(10.005)).toBe(10.01); // round-half-up, unlike plain toFixed's banker's-rounding-adjacent quirks
    expect(roundMoney(10.004)).toBe(10);
  });

  it("respects a custom precision", () => {
    expect(roundMoney(1.2345, 3)).toBe(1.235);
  });
});
