import { describe, it, expect } from "vitest";
import { matchFIFOLots, calculateRealizedPnL } from "@/lib/calculations/lots";
import { txn } from "./helpers";

describe("calculateRealizedPnL (FIFO)", () => {
  it("matches the oldest lot first", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }), // lot A
      txn({ transactionType: "BUY", quantity: 10, price: 200, transactionDate: "2024-02-01" }), // lot B
      // sell 10 -> fully consumes lot A (cost 100) at sale price 150
      txn({ transactionType: "SELL", quantity: 10, price: 150, transactionDate: "2024-03-01" }),
    ];
    // realized = 10 * (150 - 100) = 500
    expect(calculateRealizedPnL(txns)).toBeCloseTo(500);
  });

  it("spans multiple lots when a sell is larger than the oldest lot", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 5, price: 100, transactionDate: "2024-01-01" }), // lot A
      txn({ transactionType: "BUY", quantity: 10, price: 200, transactionDate: "2024-02-01" }), // lot B
      // sell 10 -> consumes all of lot A (5 @ 100) + 5 of lot B (@ 200)
      txn({ transactionType: "SELL", quantity: 10, price: 250, transactionDate: "2024-03-01" }),
    ];
    // realized = 5*(250-100) + 5*(250-200) = 750 + 250 = 1000
    expect(calculateRealizedPnL(txns)).toBeCloseTo(1000);
  });

  it("nets sell-side fees and taxes out of proceeds", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 10, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "SELL", quantity: 10, price: 150, fees: 10, taxes: 5, transactionDate: "2024-02-01" }),
    ];
    // proceeds per unit = 150 - 15/10 = 148.5; realized = 10 * (148.5 - 100) = 485
    expect(calculateRealizedPnL(txns)).toBeCloseTo(485);
  });

  it("leaves the correct open lots after a partial sell", () => {
    const txns = [
      txn({ transactionType: "BUY", quantity: 5, price: 100, transactionDate: "2024-01-01" }),
      txn({ transactionType: "BUY", quantity: 10, price: 200, transactionDate: "2024-02-01" }),
      txn({ transactionType: "SELL", quantity: 10, price: 250, transactionDate: "2024-03-01" }),
    ];
    const openLots = matchFIFOLots(txns);
    expect(openLots).toHaveLength(1);
    expect(openLots[0].quantity).toBeCloseTo(5);
    expect(openLots[0].costBasisPerUnit).toBeCloseTo(200);
  });
});
