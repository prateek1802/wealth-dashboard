import { describe, it, expect } from "vitest";
import { calculateCategoryXIRR } from "@/lib/calculations/category-xirr";
import { txn } from "./helpers";
import type { Asset } from "@/types/domain/asset";
import type { Holding } from "@/types/domain/holding";

function makeAsset(overrides: Partial<Asset>): Asset {
  return {
    id: "asset-1",
    symbol: "TEST",
    name: "Test Asset",
    assetType: "stock_in",
    currency: "INR",
    exchange: "NSE",
    sector: null,
    country: "IN",
    isin: null,
    currentPrice: 100,
    currentPriceUpdatedAt: null,
    isActive: true,
    notes: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeHolding(overrides: Partial<Holding> & { asset: Asset }): Holding {
  return {
    quantity: 10,
    weightedAverageCost: 100,
    investedAmount: 1000,
    currentValue: 1200,
    unrealizedPnl: 200,
    unrealizedPnlPercent: 20,
    realizedPnl: 0,
    allocationPercent: 100,
    ...overrides,
  };
}

describe("calculateCategoryXIRR", () => {
  it("pools cash flows separately per asset-class group", () => {
    const equityAsset = makeAsset({ id: "eq-1", assetType: "stock_in" });
    const debtAsset = makeAsset({ id: "debt-1", assetType: "bond" });

    const holdings = [
      makeHolding({ asset: equityAsset, currentValue: 1500 }),
      makeHolding({ asset: debtAsset, currentValue: 1100 }),
    ];
    const transactions = [
      txn({ assetId: "eq-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
      txn({ assetId: "debt-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
    ];

    const results = calculateCategoryXIRR(holdings, transactions, "2024-01-01");

    expect(results).toHaveLength(2);
    const equity = results.find((r) => r.group === "Equity");
    const debt = results.find((r) => r.group === "Debt");
    expect(equity?.holdingCount).toBe(1);
    expect(debt?.holdingCount).toBe(1);
    expect(equity?.result.status).toBe("ok");
    expect(debt?.result.status).toBe("ok");
    // Equity grew more (1000 -> 1500) than debt (1000 -> 1100) over the same period.
    if (equity?.result.status === "ok" && debt?.result.status === "ok") {
      expect(equity.result.value).toBeGreaterThan(debt.result.value);
    }
  });

  it("omits a group entirely when it has no holdings, rather than reporting insufficient_data", () => {
    const holdings = [makeHolding({ asset: makeAsset({ id: "eq-1", assetType: "stock_in" }) })];
    const transactions = [txn({ assetId: "eq-1", transactionDate: "2023-01-01" })];

    const results = calculateCategoryXIRR(holdings, transactions, "2024-01-01");

    expect(results).toHaveLength(1);
    expect(results[0].group).toBe("Equity");
    expect(results.find((r) => r.group === "Debt")).toBeUndefined();
    expect(results.find((r) => r.group === "Crypto")).toBeUndefined();
  });

  it("pools multiple holdings in the same group into one XIRR", () => {
    const asset1 = makeAsset({ id: "eq-1", assetType: "stock_in" });
    const asset2 = makeAsset({ id: "eq-2", assetType: "etf" });
    const holdings = [
      makeHolding({ asset: asset1, currentValue: 1200 }),
      makeHolding({ asset: asset2, currentValue: 1300 }),
    ];
    const transactions = [
      txn({ assetId: "eq-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
      txn({ assetId: "eq-2", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
    ];

    const results = calculateCategoryXIRR(holdings, transactions, "2024-01-01");

    expect(results).toHaveLength(1);
    expect(results[0].group).toBe("Equity");
    expect(results[0].holdingCount).toBe(2);
    expect(results[0].result.status).toBe("ok");
  });

  it("never produces a Cash group (cash-type assets are excluded upstream, but verify defensively)", () => {
    const holdings = [makeHolding({ asset: makeAsset({ id: "cash-1", assetType: "cash" }) })];
    const transactions = [txn({ assetId: "cash-1", transactionDate: "2023-01-01" })];

    const results = calculateCategoryXIRR(holdings, transactions, "2024-01-01");

    expect(results.some((r) => (r.group as string) === "Cash")).toBe(false);
  });

  it("returns an empty array when there are no holdings at all", () => {
    expect(calculateCategoryXIRR([], [], "2024-01-01")).toEqual([]);
  });
});
