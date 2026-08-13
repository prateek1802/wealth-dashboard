import { describe, it, expect } from "vitest";
import { calculateHoldingQuantity, calculateWeightedAverageCost, calculateInvestedAmount } from "@/lib/calculations/holdings";
import { txn } from "./helpers";

describe("calculateHoldingQuantity", () => {
  it("sums BUYs and subtracts SELLs", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10 }),
      txn({ transactionType: "BUY", quantity: 5 }),
      txn({ transactionType: "SELL", quantity: 4 }),
    ];
    expect(calculateHoldingQuantity(txns)).toBe(11);
  });
});

describe("calculateWeightedAverageCost", () => {
  it("computes a simple weighted average across two buys", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "BUY", quantity: 10, price: 200, transactionDate: "2024-02-01" }),
    ];
    // (10*100 + 10*200) / 20 = 150
    expect(calculateWeightedAverageCost(txns)).toBeCloseTo(150);
  });

  it("does not change average cost of remaining units on a SELL", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "BUY", quantity: 10, price: 200, transactionDate: "2024-02-01" }),
      // sell 5 units — weighted-average accounting leaves remaining avg cost at 150
      txn({ transactionType: "SELL", quantity: 5, price: 999, transactionDate: "2024-03-01" }),
    ];
    expect(calculateWeightedAverageCost(txns)).toBeCloseTo(150);
  });

  it("folds buy-side fees and taxes into cost basis", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, fees: 10, taxes: 5, transactionDate: "2024-01-01" }),
    ];
    // (1000 + 10 + 5) / 10 = 101.5
    expect(calculateWeightedAverageCost(txns)).toBeCloseTo(101.5);
  });

  it("returns 0 when fully sold out", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "SELL", quantity: 10, price: 150, transactionDate: "2024-02-01" }),
    ];
    expect(calculateWeightedAverageCost(txns)).toBe(0);
  });
});

describe("calculateInvestedAmount", () => {
  it("equals quantity * weighted average cost", () => {
    const txns = [txn({ transactionType: "BUY", quantity: 10, price: 100 })];
    expect(calculateInvestedAmount(txns)).toBeCloseTo(1000);
  });
});
