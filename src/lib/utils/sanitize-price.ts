/**
 * Postgres's `numeric` type (assets.current_price is numeric(18,4)) can
 * actually store the literal value NaN — unusual among databases, but true
 * for Postgres. When Supabase/PostgREST serializes a numeric NaN to JSON,
 * it comes back as the STRING "NaN" (JSON has no native NaN token), which
 * then flows straight into the UI as e.g. "₹NaN" if not caught.
 *
 * Every app code path that WRITES a price is already guarded (zod rejects
 * NaN in updateAssetPriceAction, the live-quote fetchers check
 * typeof/isFinite before returning a Quote) — so a NaN sitting in this
 * column almost certainly predates those guards, or was written directly
 * via SQL. assets.repository.ts calls this on every READ (rowToAsset) so
 * any already-corrupted row displays safely everywhere from one place, and
 * on every WRITE (assetToRow, update()'s guard) so it can't recur.
 */
export function sanitizePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
