import { describe, it, expect } from "vitest";
import {
  findPriceOnOrBefore,
  findSnapshotOnOrBefore,
  reconstructHistoricalAssetValue,
  reconstructHistoricalNetWorth,
} from "@/lib/calculations/historical-net-worth";
import type { Transaction } from "@/types/domain/transaction";
import type { Asset } from "@/types/domain/asset";
import type { FixedDeposit } from "@/types/domain/fixed-deposit";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    assetId: "a1",
    transactionType: "BUY",
    quantity: 0,
    price: 0,
    fees: 0,
    taxes: 0,
    transactionDate: "2024-01-01",
    broker: null,
    notes: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("findPriceOnOrBefore", () => {
  const history = [
    { recordedDate: "2024-01-01", price: 100 },
    { recordedDate: "2024-02-01", price: 110 },
    { recordedDate: "2024-03-01", price: 120 },
  ];

  it("returns the latest point on or before the date", () => {
    expect(findPriceOnOrBefore(history, "2024-02-15")).toBe(110);
    expect(findPriceOnOrBefore(history, "2024-03-01")).toBe(120);
  });

  it("returns null when every point is after the date — never looks into the future", () => {
    expect(findPriceOnOrBefore(history, "2023-12-31")).toBeNull();
  });

  it("returns null for an empty history", () => {
    expect(findPriceOnOrBefore([], "2024-01-01")).toBeNull();
  });
});

describe("findSnapshotOnOrBefore", () => {
  const snapshots = [
    { snapshotDate: "2024-01-01", netWorth: 1000, securitiesValue: 600, fdValue: 400 },
    { snapshotDate: "2024-03-01", netWorth: 1200, securitiesValue: 700, fdValue: 500 },
  ];

  it("returns the latest snapshot on or before the date", () => {
    expect(findSnapshotOnOrBefore(snapshots, "2024-02-01")?.netWorth).toBe(1000);
  });

  it("returns null when every snapshot is after the date", () => {
    expect(findSnapshotOnOrBefore(snapshots, "2023-06-01")).toBeNull();
  });
});

describe("reconstructHistoricalAssetValue", () => {
  const history = [{ recordedDate: "2024-01-01", price: 100 }];

  it("returns exactly 0 (not null) when the asset wasn't held yet — a known fact, not missing data", () => {
    const txns = [txn({ transactionDate: "2024-06-01", quantity: 10 })];
    expect(reconstructHistoricalAssetValue(txns, history, "2024-01-15")).toBe(0);
  });

  it("returns quantity * nearest price when held and a price exists", () => {
    const txns = [txn({ transactionDate: "2024-01-01", quantity: 10 })];
    expect(reconstructHistoricalAssetValue(txns, history, "2024-06-01")).toBe(1000);
  });

  it("returns null when held but no price exists on or before the date", () => {
    const txns = [txn({ transactionDate: "2023-01-01", quantity: 10 })];
    expect(reconstructHistoricalAssetValue(txns, history, "2023-06-01")).toBeNull();
  });

  it("nets BUY and SELL quantities before checking if it's held", () => {
    const txns = [
      txn({ transactionDate: "2024-01-01", transactionType: "BUY", quantity: 10 }),
      txn({ transactionDate: "2024-02-01", transactionType: "SELL", quantity: 10 }),
    ];
    expect(reconstructHistoricalAssetValue(txns, history, "2024-06-01")).toBe(0);
  });
});

describe("reconstructHistoricalNetWorth", () => {
  const asset: Asset = {
    id: "a1", symbol: "TEST", name: "Test Fund", assetType: "mutual_fund", currency: "INR",
    exchange: null, sector: null, country: null, isin: null, currentPrice: null,
    currentPriceUpdatedAt: null, isActive: true, notes: null, createdAt: "", updatedAt: "",
  };
  const fd: FixedDeposit = {
    id: "fd1", institution: "Test Bank", principal: 100_000, interestRate: 7, startDate: "2024-01-01",
    maturityDate: "2026-01-01", tenureMonths: 24, payoutType: "cumulative", maturityAmount: null,
    status: "active", withdrawalDate: null, withdrawalAmount: null, notes: null, createdAt: "", updatedAt: "",
  };
  const snapshots = [{ snapshotDate: "2024-01-01", netWorth: 50_000, securitiesValue: 20_000, fdValue: 0 }];

  it("sums exact securities + exact FD + the snapshot's residual (everything else, still approximated)", () => {
    const result = reconstructHistoricalNetWorth({
      date: "2024-06-01",
      securityAssets: [asset],
      transactionsByAsset: new Map([["a1", [txn({ assetId: "a1", transactionDate: "2024-01-01", quantity: 10 })]]]),
      priceHistoryByAsset: new Map([["a1", [{ recordedDate: "2024-01-01", price: 100 }]]]),
      fixedDeposits: [fd],
      snapshotsSortedAsc: snapshots,
    });
    // securities: 10 * 100 = 1000. FD: accrued value at ~5 months. residual: 50000-20000-0=30000.
    expect(result.isExact).toBe(true);
    expect(result.netWorth).toBeGreaterThan(1000 + 100_000 + 30_000 - 1); // roughly principal + a little accrued interest
  });

  it("falls back to the snapshot's securities figure (and marks isExact false) when a held asset has no price for that date", () => {
    const result = reconstructHistoricalNetWorth({
      date: "2024-06-01",
      securityAssets: [asset],
      transactionsByAsset: new Map([["a1", [txn({ assetId: "a1", transactionDate: "2024-01-01", quantity: 10 })]]]),
      priceHistoryByAsset: new Map(), // no price history at all for this asset
      fixedDeposits: [],
      snapshotsSortedAsc: snapshots,
    });
    expect(result.isExact).toBe(false);
    expect(result.netWorth).toBe(20_000 + 0 + 30_000); // falls back to snapshot's securitiesValue
  });

  it("is exact when no securities are held at all on that date (nothing to look up)", () => {
    const result = reconstructHistoricalNetWorth({
      date: "2023-01-01",
      securityAssets: [asset],
      transactionsByAsset: new Map([["a1", [txn({ assetId: "a1", transactionDate: "2024-01-01", quantity: 10 })]]]),
      priceHistoryByAsset: new Map(),
      fixedDeposits: [],
      snapshotsSortedAsc: [],
    });
    expect(result.isExact).toBe(true);
    expect(result.netWorth).toBe(0);
  });
});
