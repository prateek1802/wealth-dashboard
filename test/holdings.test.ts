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

  it("prices a SELL off the oldest lot (FIFO), not the blended pool", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "BUY", quantity: 10, price: 200, transactionDate: "2024-02-01" }),
      // sell 5 units — FIFO consumes 5 from the oldest (100) lot, leaving
      // 5@100 + 10@200 = 2500 / 15 = 166.67, NOT the old blended-pool value of 150
      txn({ transactionType: "SELL", quantity: 5, price: 999, transactionDate: "2024-03-01" }),
    ];
    expect(calculateWeightedAverageCost(txns)).toBeCloseTo(2500 / 15);
  });

  it("does not shift average cost from an offsetting BUY+SELL of a stale lot", () => {
    // Regression test: an existing holding plus a same-day offsetting
    // BUY then SELL of equal quantity should fully round-trip through the
    // FIFO queue and leave the original lot's average cost untouched.
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "BUY", quantity: 10, price: 500, transactionDate: "2024-03-01" }),
      txn({ transactionType: "SELL", quantity: 10, price: 550, transactionDate: "2024-03-01" }),
    ];
    // FIFO consumes the original 10@100 lot on the SELL, leaving the 10@500
    // lot open. Net quantity is unchanged (10), but the average correctly
    // reflects the specific lot that remains (500) — not the old buggy
    // blended value of 200 you'd get from pricing the SELL off the pool.
    expect(calculateWeightedAverageCost(txns)).toBeCloseTo(500);
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
