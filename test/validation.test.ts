import { describe, it, expect } from "vitest";
import { transactionSchema } from "@/lib/validation/transaction.schema";
import { assetPriceUpdateSchema } from "@/lib/validation/asset.schema";
import { watchlistItemSchema } from "@/lib/validation/watchlist.schema";
import { npsContributionSchema } from "@/lib/validation/nps.schema";

// Regression coverage for the "Invalid UUID" bug: demo mode's asset/account
// IDs are strings like "asset-tcs" or "asset-1042", not real UUIDs (only a
// connected Supabase project produces those via gen_random_uuid()). Every
// schema referencing one of these IDs must accept non-UUID strings.

describe("ID fields accept demo-mode (non-UUID) IDs", () => {
  it("transactionSchema accepts a demo-mode assetId", () => {
    const result = transactionSchema.safeParse({
      assetId: "asset-tcs",
      transactionType: "BUY",
      quantity: 10,
      price: 342,
      fees: 0,
      taxes: 0,
      transactionDate: "2026-08-11",
      broker: "Zerodha",
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("assetPriceUpdateSchema accepts a demo-mode assetId", () => {
    const result = assetPriceUpdateSchema.safeParse({ assetId: "asset-1042", currentPrice: 100 });
    expect(result.success).toBe(true);
  });

  it("watchlistItemSchema accepts a demo-mode assetId", () => {
    const result = watchlistItemSchema.safeParse({ assetId: "asset-tcs", targetPrice: null, stopLoss: null, note: null });
    expect(result.success).toBe(true);
  });

  it("npsContributionSchema accepts a demo-mode npsAccountId", () => {
    const result = npsContributionSchema.safeParse({
      npsAccountId: "nps-1",
      contributionDate: "2026-08-11",
      employeeAmount: 4000,
      employerAmount: 4000,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("still rejects an empty assetId", () => {
    const result = transactionSchema.safeParse({
      assetId: "",
      transactionType: "BUY",
      quantity: 10,
      price: 342,
      fees: 0,
      taxes: 0,
      transactionDate: "2026-08-11",
      broker: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });
});
