import { getServerSupabaseClient, isDemoMode } from "@/lib/database/client";
import { demoAssets, nextId } from "@/lib/database/demo-data";
import type { Asset, NewAsset, AssetUpdate } from "@/types/domain/asset";
import type { AssetRow } from "@/types/database";
import type { AssetType } from "@/constants/asset-types";

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    assetType: row.asset_type as AssetType,
    currency: row.currency,
    exchange: row.exchange,
    sector: row.sector,
    country: row.country,
    isin: row.isin,
    currentPrice: row.current_price,
    currentPriceUpdatedAt: row.current_price_updated_at,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assetToRow(a: NewAsset) {
  return {
    symbol: a.symbol,
    name: a.name,
    asset_type: a.assetType,
    currency: a.currency,
    exchange: a.exchange,
    sector: a.sector,
    country: a.country,
    isin: a.isin,
    current_price: a.currentPrice,
    current_price_updated_at: a.currentPriceUpdatedAt,
    is_active: a.isActive,
    notes: a.notes,
  };
}

export const assetsRepository = {
  async findAll(): Promise<Asset[]> {
    if (isDemoMode()) return [...demoAssets].filter((a) => a.isActive);
    const db = getServerSupabaseClient();
    const { data, error } = await db.from("assets").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return (data as AssetRow[]).map(rowToAsset);
  },

  async findById(id: string): Promise<Asset | null> {
    if (isDemoMode()) return demoAssets.find((a) => a.id === id) ?? null;
    const db = getServerSupabaseClient();
    const { data, error } = await db.from("assets").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToAsset(data as AssetRow) : null;
  },

  async findBySymbolAndType(symbol: string, assetType: string): Promise<Asset | null> {
    if (isDemoMode()) {
      return demoAssets.find((a) => a.symbol === symbol && a.assetType === assetType) ?? null;
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db
      .from("assets")
      .select("*")
      .eq("symbol", symbol)
      .eq("asset_type", assetType)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToAsset(data as AssetRow) : null;
  },

  /** Find-or-create by (symbol, assetType) — used when recording a transaction for a new asset. */
  async upsertBySymbol(input: NewAsset): Promise<Asset> {
    const existing = await this.findBySymbolAndType(input.symbol, input.assetType);
    if (existing) return existing;

    if (isDemoMode()) {
      const asset: Asset = { ...input, id: nextId("asset"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoAssets.push(asset);
      return asset;
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db.from("assets").insert(assetToRow(input)).select().single();
    if (error) throw error;
    return rowToAsset(data as AssetRow);
  },

  async update(id: string, update: AssetUpdate): Promise<Asset> {
    if (isDemoMode()) {
      const asset = demoAssets.find((a) => a.id === id);
      if (!asset) throw new Error("Asset not found");
      Object.assign(asset, update, { updatedAt: new Date().toISOString() });
      return asset;
    }
    const db = getServerSupabaseClient();
    const row: Record<string, unknown> = {};
    if (update.name !== undefined) row.name = update.name;
    if (update.currentPrice !== undefined) {
      row.current_price = update.currentPrice;
      row.current_price_updated_at = new Date().toISOString();
    }
    if (update.notes !== undefined) row.notes = update.notes;
    if (update.exchange !== undefined) row.exchange = update.exchange;
    if (update.sector !== undefined) row.sector = update.sector;
    if (update.country !== undefined) row.country = update.country;
    if (update.isin !== undefined) row.isin = update.isin;
    if (update.currency !== undefined) row.currency = update.currency;
    if (update.isActive !== undefined) row.is_active = update.isActive;
    const { data, error } = await db.from("assets").update(row).eq("id", id).select().single();
    if (error) throw error;
    return rowToAsset(data as AssetRow);
  },

  async updatePrice(id: string, price: number): Promise<Asset> {
    return this.update(id, { currentPrice: price, currentPriceUpdatedAt: new Date().toISOString() });
  },

  async softDelete(id: string): Promise<void> {
    if (isDemoMode()) {
      const asset = demoAssets.find((a) => a.id === id);
      if (asset) asset.isActive = false;
      return;
    }
    const db = getServerSupabaseClient();
    const { error } = await db.from("assets").update({ is_active: false }).eq("id", id);
    if (error) throw error;
  },
};
