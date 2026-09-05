import { describe, it, expect } from "vitest";
import { calculateFilteredXIRR, type XIRRClass, type XIRRAssetInput, type XIRRTransactionInput } from "@/lib/calculations/filtered-xirr";

function makeHolding(overrides: Partial<XIRRAssetInput> & { assetId: string }): XIRRAssetInput {
  return { assetType: "stock_in", currentValue: 1200, ...overrides };
}

function makeTxn(overrides: Partial<XIRRTransactionInput> & { assetId: string }): XIRRTransactionInput {
  return { transactionDate: "2023-01-01", transactionType: "BUY", quantity: 10, price: 100, fees: 0, taxes: 0, ...overrides };
}

describe("calculateFilteredXIRR", () => {
  it("includes only holdings/transactions from the selected classes", () => {
    const holdings = [
      makeHolding({ assetId: "stock-1", assetType: "stock_in", currentValue: 1500 }),
      makeHolding({ assetId: "crypto-1", assetType: "crypto", currentValue: 50000 }),
    ];
    const transactions = [
      makeTxn({ assetId: "stock-1", quantity: 10, price: 100 }),
      makeTxn({ assetId: "crypto-1", quantity: 1, price: 30000 }),
    ];

    const stocksOnly = calculateFilteredXIRR(new Set<XIRRClass>(["stocks"]), holdings, transactions, [], "2024-01-01");
    const cryptoOnly = calculateFilteredXIRR(new Set<XIRRClass>(["crypto"]), holdings, transactions, [], "2024-01-01");

    expect(stocksOnly.status).toBe("ok");
    expect(cryptoOnly.status).toBe("ok");
    // Crypto grew far more (30k -> 50k) than the stock (1000 -> 1500) over the same window.
    if (stocksOnly.status === "ok" && cryptoOnly.status === "ok") {
      expect(cryptoOnly.value).toBeGreaterThan(stocksOnly.value);
    }
  });

  it("folds stock_in and stock_us into the same 'stocks' class", () => {
    const holdings = [
      makeHolding({ assetId: "in-1", assetType: "stock_in", currentValue: 1200 }),
      makeHolding({ assetId: "us-1", assetType: "stock_us", currentValue: 1300 }),
    ];
    const transactions = [makeTxn({ assetId: "in-1" }), makeTxn({ assetId: "us-1" })];

    const result = calculateFilteredXIRR(new Set<XIRRClass>(["stocks"]), holdings, transactions, [], "2024-01-01");
    expect(result.status).toBe("ok");
  });

  it("includes NPS cashflows wholesale only when 'nps' is selected", () => {
    const npsCashflows = [
      { date: "2023-01-01", amount: -50000 },
      { date: "2024-01-01", amount: 60000 },
    ];

    const withoutNps = calculateFilteredXIRR(new Set<XIRRClass>(["stocks"]), [], [], npsCashflows, "2024-01-01");
    const withNps = calculateFilteredXIRR(new Set<XIRRClass>(["nps"]), [], [], npsCashflows, "2024-01-01");

    expect(withoutNps.status).toBe("insufficient_data"); // nothing selected has any data
    expect(withNps.status).toBe("ok");
  });

  it("returns insufficient_data when nothing is selected", () => {
    const holdings = [makeHolding({ assetId: "in-1" })];
    const transactions = [makeTxn({ assetId: "in-1" })];
    const result = calculateFilteredXIRR(new Set<XIRRClass>([]), holdings, transactions, [], "2024-01-01");
    expect(result.status).toBe("insufficient_data");
  });

  it("never includes an 'other'-type holding regardless of selection (not in the checkbox list)", () => {
    const holdings = [makeHolding({ assetId: "other-1", assetType: "other", currentValue: 5000 })];
    const transactions = [makeTxn({ assetId: "other-1" })];
    const allClasses = new Set<XIRRClass>(["stocks", "etf", "mutual_fund_equity", "mutual_fund_debt", "crypto", "bonds", "nps"]);
    const result = calculateFilteredXIRR(allClasses, holdings, transactions, [], "2024-01-01");
    expect(result.status).toBe("insufficient_data");
  });
});
