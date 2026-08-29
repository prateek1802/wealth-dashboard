import { describe, it, expect } from "vitest";
import { sanitizePrice } from "@/lib/utils/sanitize-price";
import { rowToAsset } from "@/lib/database/asset-mapping";
import type { AssetRow } from "@/types/database";

function makeAssetRow(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: "asset-1",
    symbol: "INFY",
    name: "Infosys Limited",
    asset_type: "equity",
    currency: "INR",
    exchange: "NSE",
    sector: null,
    country: "IN",
    isin: null,
    current_price: 1500.5,
    current_price_updated_at: "2026-08-20T00:00:00.000Z",
    is_active: true,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("rowToAsset", () => {
  it("maps every snake_case DB field to its camelCase Asset field", () => {
    const asset = rowToAsset(makeAssetRow());
    // The actual regression: watchlist.repository.ts's `assets(*)` join
    // previously cast a raw row like this straight to the Asset type with
    // NO conversion, leaving every camelCase field the app reads
    // (currentPrice, assetType, isActive, ...) undefined — which rendered
    // as "₹NaN" for every single watchlist item via
    // formatCurrency(undefined, ...), regardless of what price was really
    // stored. This test locks in that the mapping actually happens.
    expect(asset).toEqual({
      id: "asset-1",
      symbol: "INFY",
      name: "Infosys Limited",
      assetType: "equity",
      currency: "INR",
      exchange: "NSE",
      sector: null,
      country: "IN",
      isin: null,
      currentPrice: 1500.5,
      currentPriceUpdatedAt: "2026-08-20T00:00:00.000Z",
      isActive: true,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("sanitizes a corrupted current_price the same way whether read via assets.repository.ts or watchlist.repository.ts's join", () => {
    const asset = rowToAsset(makeAssetRow({ current_price: "NaN" as unknown as number }));
    expect(asset.currentPrice).toBeNull();
  });
});

describe("sanitizePrice", () => {
  it("passes through a normal finite number unchanged", () => {
    expect(sanitizePrice(1725.4)).toBe(1725.4);
  });

  it("passes through null unchanged", () => {
    expect(sanitizePrice(null)).toBeNull();
  });

  it("converts a literal NaN number to null", () => {
    expect(sanitizePrice(NaN)).toBeNull();
  });

  it('converts the string "NaN" to null — what a Postgres numeric NaN column looks like once PostgREST serializes it to JSON', () => {
    expect(sanitizePrice("NaN")).toBeNull();
  });

  it("parses a valid numeric string (defensive — in case a numeric column ever comes back stringified)", () => {
    expect(sanitizePrice("1725.4")).toBe(1725.4);
  });

  it("converts Infinity/-Infinity to null", () => {
    expect(sanitizePrice(Infinity)).toBeNull();
    expect(sanitizePrice(-Infinity)).toBeNull();
  });

  it("converts undefined and other garbage to null rather than throwing", () => {
    expect(sanitizePrice(undefined)).toBeNull();
    expect(sanitizePrice({})).toBeNull();
    expect(sanitizePrice("abc")).toBeNull();
  });
});

