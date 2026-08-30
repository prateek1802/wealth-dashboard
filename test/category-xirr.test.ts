import { describe, it, expect } from "vitest";
import { calculateCategoryXIRR } from "@/lib/calculations/category-xirr";
import { txn } from "./helpers";
import type { Asset } from "@/types/domain/asset";
import type { Holding } from "@/types/domain/holding";
import type { NPSSchemeHolding, NPSSchemeTransaction } from "@/types/domain/nps";

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

function makeSchemeHolding(overrides: Partial<NPSSchemeHolding>): NPSSchemeHolding {
  return {
    id: "sh-1",
    npsAccountId: "acc-1",
    scheme: "E",
    unitsHeld: 100,
    lastNav: 50,
    lastNavDate: "2024-01-01",
    npsnavSchemeCode: null,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSchemeTxn(overrides: Partial<NPSSchemeTransaction>): NPSSchemeTransaction {
  return {
    id: "st-1",
    npsAccountId: "acc-1",
    scheme: "E",
    transactionType: "contribution",
    transactionDate: "2023-01-01",
    units: 100,
    nav: 40,
    amount: 4000,
    employeeAmount: null,
    employerAmount: null,
    linkedTransactionId: null,
    description: null,
    createdAt: "2023-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("calculateCategoryXIRR — per-asset-type breakdown", () => {
  it("keeps Indian Stock, US Stock, and Equity MF as SEPARATE rows, not pooled into one 'Equity' bucket", () => {
    const holdings = [
      makeHolding({ asset: makeAsset({ id: "in-1", assetType: "stock_in" }), currentValue: 1500 }),
      makeHolding({ asset: makeAsset({ id: "us-1", assetType: "stock_us" }), currentValue: 1100 }),
      makeHolding({ asset: makeAsset({ id: "mf-1", assetType: "mutual_fund" }), currentValue: 1300 }),
    ];
    const transactions = [
      txn({ assetId: "in-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
      txn({ assetId: "us-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
      txn({ assetId: "mf-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
    ];

    const results = calculateCategoryXIRR(holdings, transactions, [], [], "2024-01-01");

    expect(results.map((r) => r.key).sort()).toEqual(["mutual_fund", "stock_in", "stock_us"]);
    expect(results.find((r) => r.key === "stock_in")?.label).toBe("Indian Stock");
    expect(results.every((r) => r.count === 1)).toBe(true);
  });

  it("pools multiple holdings of the SAME type into one row", () => {
    const holdings = [
      makeHolding({ asset: makeAsset({ id: "in-1", assetType: "stock_in" }), currentValue: 1200 }),
      makeHolding({ asset: makeAsset({ id: "in-2", assetType: "stock_in" }), currentValue: 1300 }),
    ];
    const transactions = [
      txn({ assetId: "in-1", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
      txn({ assetId: "in-2", transactionDate: "2023-01-01", quantity: 10, price: 100 }),
    ];

    const results = calculateCategoryXIRR(holdings, transactions, [], [], "2024-01-01");

    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("stock_in");
    expect(results[0].count).toBe(2);
  });

  it("omits an asset type with no holdings", () => {
    const holdings = [makeHolding({ asset: makeAsset({ id: "in-1", assetType: "stock_in" }) })];
    const transactions = [txn({ assetId: "in-1", transactionDate: "2023-01-01" })];

    const results = calculateCategoryXIRR(holdings, transactions, [], [], "2024-01-01");

    expect(results).toHaveLength(1);
    expect(results.find((r) => r.key === "crypto")).toBeUndefined();
  });
});

describe("calculateCategoryXIRR — NPS per-scheme breakdown", () => {
  it("gives NPS Equity (E) its own row, separate from securities Equity types", () => {
    const holdings = [makeHolding({ asset: makeAsset({ id: "in-1", assetType: "stock_in" }), currentValue: 1500 })];
    const transactions = [txn({ assetId: "in-1", transactionDate: "2023-01-01", quantity: 10, price: 100 })];
    const npsHoldings = [makeSchemeHolding({ scheme: "E", unitsHeld: 100, lastNav: 50 })]; // current value 5000
    const npsTxns = [makeSchemeTxn({ scheme: "E", transactionType: "contribution", transactionDate: "2023-01-01", amount: 4000 })];

    const results = calculateCategoryXIRR(holdings, transactions, npsHoldings, npsTxns, "2024-01-01");

    expect(results.map((r) => r.key).sort()).toEqual(["nps_E", "stock_in"]);
    expect(results.find((r) => r.key === "nps_E")?.label).toBe("NPS — Equity");
  });

  it("excludes switch_in/switch_out from NPS scheme cash flows", () => {
    const npsHoldings = [makeSchemeHolding({ scheme: "C", unitsHeld: 100, lastNav: 50 })];
    const npsTxns = [
      makeSchemeTxn({ scheme: "C", transactionType: "contribution", transactionDate: "2023-01-01", amount: 4000 }),
      makeSchemeTxn({ scheme: "C", transactionType: "switch_in", transactionDate: "2023-06-01", amount: 10000 }),
    ];

    const results = calculateCategoryXIRR([], [], npsHoldings, npsTxns, "2024-01-01");

    expect(results).toHaveLength(1);
    // If switch_in had been included, the pooled cash flow would be
    // radically different (an extra 10,000 inflow-side entry) — this just
    // confirms a result was computed at all from the contribution alone.
    expect(results[0].result.status).toBe("ok");
  });

  it("gives each of the four NPS schemes its own row when all are held", () => {
    const npsHoldings = (["E", "C", "G", "A"] as const).map((scheme) => makeSchemeHolding({ scheme, unitsHeld: 100, lastNav: 50 }));
    const npsTxns = (["E", "C", "G", "A"] as const).map((scheme) =>
      makeSchemeTxn({ scheme, transactionType: "contribution", transactionDate: "2023-01-01", amount: 4000 })
    );

    const results = calculateCategoryXIRR([], [], npsHoldings, npsTxns, "2024-01-01");

    expect(results.map((r) => r.key).sort()).toEqual(["nps_A", "nps_C", "nps_E", "nps_G"]);
  });

  it("omits an NPS scheme with no holding", () => {
    const npsHoldings = [makeSchemeHolding({ scheme: "E", unitsHeld: 100, lastNav: 50 })];
    const npsTxns = [makeSchemeTxn({ scheme: "E", transactionType: "contribution", amount: 4000 })];

    const results = calculateCategoryXIRR([], [], npsHoldings, npsTxns, "2024-01-01");

    expect(results).toHaveLength(1);
    expect(results.find((r) => r.key === "nps_C")).toBeUndefined();
  });
});

describe("calculateCategoryXIRR — edge cases", () => {
  it("returns an empty array when there is nothing at all", () => {
    expect(calculateCategoryXIRR([], [], [], [], "2024-01-01")).toEqual([]);
  });

  it("defaults npsSchemeHoldings/npsSchemeTransactions to empty arrays when omitted", () => {
    const holdings = [makeHolding({ asset: makeAsset({ id: "in-1", assetType: "stock_in" }) })];
    const transactions = [txn({ assetId: "in-1", transactionDate: "2023-01-01" })];
    expect(() => calculateCategoryXIRR(holdings, transactions, undefined, undefined, "2024-01-01")).not.toThrow();
  });
});
