import { describe, it, expect } from "vitest";
import {
  classifyCapitalGainType,
  daysUntilLongTerm,
  findHarvestableLots,
  matchRealizedGainEvents,
  currentIndianFinancialYear,
} from "@/lib/calculations/tax-harvesting";
import type { Transaction } from "@/types/domain/transaction";

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    assetId: "a1",
    transactionType: "BUY",
    quantity: 10,
    price: 100,
    fees: 0,
    taxes: 0,
    transactionDate: "2024-01-01",
    broker: null,
    notes: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("classifyCapitalGainType", () => {
  it("classifies Indian equity (stock_in) with the 12-month / 365-day threshold", () => {
    expect(classifyCapitalGainType("stock_in", "2024-01-01", "2024-10-01")).toBe("short_term"); // ~274 days
    expect(classifyCapitalGainType("stock_in", "2024-01-01", "2025-06-01")).toBe("long_term"); // ~517 days
  });

  it("classifies equity mutual funds the same as Indian equity (12 months)", () => {
    expect(classifyCapitalGainType("mutual_fund", "2024-01-01", "2024-06-01")).toBe("short_term");
    expect(classifyCapitalGainType("mutual_fund", "2024-01-01", "2025-06-01")).toBe("long_term");
  });

  it("classifies US/foreign stock with the 24-month / 730-day threshold, not 12 months", () => {
    // ~517 days -- long-term for Indian equity, but still short-term for foreign shares
    expect(classifyCapitalGainType("stock_us", "2024-01-01", "2025-06-01")).toBe("short_term");
    expect(classifyCapitalGainType("stock_us", "2024-01-01", "2026-03-01")).toBe("long_term"); // ~789 days
  });

  it("classifies debt MF units bought before 1 Apr 2023 with the 24-month threshold", () => {
    expect(classifyCapitalGainType("mutual_fund_debt", "2023-01-01", "2024-06-01")).toBe("short_term"); // ~517 days
    expect(classifyCapitalGainType("mutual_fund_debt", "2023-01-01", "2025-06-01")).toBe("long_term"); // ~882 days
  });

  it("classifies debt MF units bought on/after 1 Apr 2023 as ALWAYS short-term, regardless of holding period", () => {
    expect(classifyCapitalGainType("mutual_fund_debt", "2023-04-01", "2024-01-01")).toBe("short_term");
    // Even after many years, post-Apr-2023 debt MF units never get long-term treatment.
    expect(classifyCapitalGainType("mutual_fund_debt", "2023-04-01", "2030-01-01")).toBe("short_term");
  });

  it("classifies crypto as flat_rate_vda regardless of holding period", () => {
    expect(classifyCapitalGainType("crypto", "2020-01-01", "2026-01-01")).toBe("flat_rate_vda");
    expect(classifyCapitalGainType("crypto", "2026-01-01", "2026-01-02")).toBe("flat_rate_vda");
  });

  it("classifies bonds as unsupported -- deliberately does not guess a rule", () => {
    expect(classifyCapitalGainType("bond", "2020-01-01", "2026-01-01")).toBe("unsupported");
  });
});

describe("daysUntilLongTerm", () => {
  it("returns the remaining days for a short-term lot", () => {
    // Held 300 of 365 days for equity -> 65 remaining
    expect(daysUntilLongTerm("stock_in", "2024-01-01", "2024-10-27")).toBe(65);
  });

  it("returns null once a lot is already long-term", () => {
    expect(daysUntilLongTerm("stock_in", "2024-01-01", "2025-06-01")).toBeNull();
  });

  it("returns null for crypto (no long-term concept exists)", () => {
    expect(daysUntilLongTerm("crypto", "2024-01-01", "2024-06-01")).toBeNull();
  });

  it("returns null for post-Apr-2023 debt MF (will never become long-term)", () => {
    expect(daysUntilLongTerm("mutual_fund_debt", "2023-04-01", "2024-01-01")).toBeNull();
  });
});

describe("findHarvestableLots", () => {
  it("only returns lots currently at a loss, skipping lots at a gain", () => {
    const transactions = [
      txn({ id: "t1", transactionType: "BUY", price: 200, quantity: 10, transactionDate: "2024-01-01" }), // will be at a loss
      txn({ id: "t2", transactionType: "BUY", price: 50, quantity: 10, transactionDate: "2024-02-01" }), // will be at a gain
    ];
    const currentPrice = 100;

    const result = findHarvestableLots("a1", "stock_in", transactions, currentPrice, "2025-01-01");

    expect(result).toHaveLength(1);
    expect(result[0].acquiredDate).toBe("2024-01-01");
    expect(result[0].lossAmount).toBeCloseTo(1000, 2); // (200-100) * 10
  });

  it("computes lossAmount and classification correctly for a long-term losing lot", () => {
    const transactions = [txn({ price: 500, quantity: 5, transactionDate: "2023-01-01" })];
    const result = findHarvestableLots("a1", "stock_in", transactions, 300, "2025-01-01");

    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe("long_term");
    expect(result[0].lossAmount).toBeCloseTo(1000, 2); // (500-300) * 5
    expect(result[0].daysUntilLongTerm).toBeNull();
  });

  it("returns nothing when currentPrice is unknown", () => {
    const transactions = [txn({ price: 500 })];
    expect(findHarvestableLots("a1", "stock_in", transactions, null, "2025-01-01")).toEqual([]);
  });

  it("includes crypto lots (tagged flat_rate_vda) rather than silently hiding them", () => {
    const transactions = [txn({ price: 5_000_000, quantity: 1, transactionDate: "2024-01-01" })];
    const result = findHarvestableLots("a1", "crypto", transactions, 3_000_000, "2025-01-01");
    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe("flat_rate_vda");
  });
});

describe("matchRealizedGainEvents", () => {
  it("splits a single SELL that spans a short-term lot and a long-term lot into two separately-classified events", () => {
    const transactions = [
      txn({ id: "b1", transactionType: "BUY", price: 100, quantity: 5, transactionDate: "2023-01-01" }), // will be long-term by the sell date
      txn({ id: "b2", transactionType: "BUY", price: 150, quantity: 5, transactionDate: "2024-11-01" }), // will still be short-term
      txn({ id: "s1", transactionType: "SELL", price: 200, quantity: 10, transactionDate: "2025-01-01" }),
    ];

    const events = matchRealizedGainEvents("stock_in", transactions);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ acquiredDate: "2023-01-01", quantity: 5, classification: "long_term" });
    expect(events[0].gain).toBeCloseTo(500, 2); // (200-100)*5
    expect(events[1]).toMatchObject({ acquiredDate: "2024-11-01", quantity: 5, classification: "short_term" });
    expect(events[1].gain).toBeCloseTo(250, 2); // (200-150)*5
  });

  it("captures a realized LOSS as a negative gain, correctly classified", () => {
    const transactions = [
      txn({ transactionType: "BUY", price: 500, quantity: 10, transactionDate: "2024-06-01" }),
      txn({ transactionType: "SELL", price: 300, quantity: 10, transactionDate: "2024-12-01" }),
    ];
    const events = matchRealizedGainEvents("stock_in", transactions);
    expect(events).toHaveLength(1);
    expect(events[0].gain).toBeCloseTo(-2000, 2);
    expect(events[0].classification).toBe("short_term");
  });
});

describe("currentIndianFinancialYear", () => {
  it("resolves a date in Jan-Mar to the FY that started the PREVIOUS calendar year", () => {
    const fy = currentIndianFinancialYear("2025-02-15");
    expect(fy).toEqual({ start: "2024-04-01", end: "2025-03-31", label: "FY 2024-25" });
  });

  it("resolves a date in Apr-Dec to the FY that started the SAME calendar year", () => {
    const fy = currentIndianFinancialYear("2025-08-15");
    expect(fy).toEqual({ start: "2025-04-01", end: "2026-03-31", label: "FY 2025-26" });
  });

  it("treats April 1st itself as the first day of the new FY", () => {
    const fy = currentIndianFinancialYear("2025-04-01");
    expect(fy.start).toBe("2025-04-01");
  });
});
