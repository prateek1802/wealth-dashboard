import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoWatchlist, nextId } from "@/lib/database/demo-data";
import { assetsRepository } from "./assets.repository";
import { rowToAsset } from "@/lib/database/asset-mapping";
import type { WatchlistItem, NewWatchlistItem } from "@/types/domain/watchlist";
import type { WatchlistItemRow, AssetRow } from "@/types/database";

export const watchlistRepository = {
  async findAll(): Promise<WatchlistItem[]> {
    if (isDemoMode()) return [...demoWatchlist];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("watchlist_items").select("*, assets(*)").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as (WatchlistItemRow & { assets: AssetRow })[]).map((row) => ({
      id: row.id,
      assetId: row.asset_id,
      // rowToAsset(), NOT a raw cast — the joined `assets` column comes
      // back as a raw snake_case DB row (current_price, asset_type, ...),
      // not the camelCase Asset domain type. A bare `as` cast here
      // previously left every field undefined at the actual keys the app
      // reads (item.asset.currentPrice, item.asset.assetType, etc.),
      // which is what caused "₹NaN" to render for every single watchlist
      // item regardless of what price was actually stored — formatCurrency
      // renders undefined as NaN. rowToAsset() also applies sanitizePrice(),
      // so a genuinely corrupted current_price is still handled.
      asset: rowToAsset(row.assets),
      targetPrice: row.target_price,
      stopLoss: row.stop_loss,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async add(input: NewWatchlistItem): Promise<WatchlistItem> {
    const asset = await assetsRepository.findById(input.assetId);
    if (!asset) throw new Error("Asset not found");

    if (isDemoMode()) {
      const item: WatchlistItem = {
        id: nextId("wl"),
        assetId: input.assetId,
        asset,
        targetPrice: input.targetPrice,
        stopLoss: input.stopLoss,
        note: input.note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      demoWatchlist.push(item);
      return item;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("watchlist_items")
      .insert({ asset_id: input.assetId, target_price: input.targetPrice, stop_loss: input.stopLoss, note: input.note })
      .select()
      .single();
    if (error) throw error;
    const row = data as WatchlistItemRow;
    return { id: row.id, assetId: row.asset_id, asset, targetPrice: row.target_price, stopLoss: row.stop_loss, note: row.note, createdAt: row.created_at, updatedAt: row.updated_at };
  },

  async remove(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoWatchlist.findIndex((w) => w.id === id);
      if (idx >= 0) demoWatchlist.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("watchlist_items").delete().eq("id", id);
    if (error) throw error;
  },
};
