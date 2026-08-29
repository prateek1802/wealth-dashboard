import { sanitizePrice } from "@/lib/utils/sanitize-price";
import type { Asset, NewAsset } from "@/types/domain/asset";
import type { AssetRow } from "@/types/database";
import type { AssetType } from "@/constants/asset-types";

/**
 * The ONLY place an AssetRow (snake_case, straight off the wire from
 * Supabase) becomes an Asset (camelCase, what the rest of the app reads).
 * Both assets.repository.ts (its own findAll/findById/etc.) and
 * watchlist.repository.ts (its `assets(*)` join) must go through this —
 * watchlist.repository.ts previously cast the raw joined row straight to
 * the Asset type with no actual field conversion, which left every field
 * undefined at the keys the app actually reads (item.asset.currentPrice,
 * item.asset.assetType, ...) and rendered as "₹NaN" for every single
 * watchlist item, regardless of what price was really stored.
 *
 * Also applies sanitizePrice() — see that function's doc comment for the
 * separate (and real) Postgres-numeric-can-store-NaN issue this also
 * guards against.
 */
export function rowToAsset(row: AssetRow): Asset {
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
    currentPrice: sanitizePrice(row.current_price),
    currentPriceUpdatedAt: row.current_price_updated_at,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function assetToRow(a: NewAsset) {
  return {
    symbol: a.symbol,
    name: a.name,
    asset_type: a.assetType,
    currency: a.currency,
    exchange: a.exchange,
    sector: a.sector,
    country: a.country,
    isin: a.isin,
    // sanitizePrice() here too — upsertBySymbol's INSERT path (used by CSV
    // import and backup restore, the latter trusting an uploaded file) is
    // a separate write path from update()'s guard.
    current_price: sanitizePrice(a.currentPrice),
    current_price_updated_at: a.currentPriceUpdatedAt,
    is_active: a.isActive,
    notes: a.notes,
  };
}
