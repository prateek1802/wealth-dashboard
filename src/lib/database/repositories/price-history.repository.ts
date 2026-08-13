import { getServerSupabaseClient, isDemoMode } from "@/lib/database/client";
import { demoPriceHistory, nextId } from "@/lib/database/demo-data";
import { todayISO } from "@/lib/utils/date";
import type { PriceHistoryPoint } from "@/types/domain/price-history";
import type { PriceHistoryRow } from "@/types/database";

function rowToPoint(row: PriceHistoryRow): PriceHistoryPoint {
  return { id: row.id, assetId: row.asset_id, price: row.price, recordedDate: row.recorded_date, createdAt: row.created_at };
}

export const priceHistoryRepository = {
  async findByAsset(assetId: string): Promise<PriceHistoryPoint[]> {
    if (isDemoMode()) {
      return demoPriceHistory.filter((p) => p.assetId === assetId).sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db.from("price_history").select("*").eq("asset_id", assetId).order("recorded_date");
    if (error) throw error;
    return (data as PriceHistoryRow[]).map(rowToPoint);
  },

  /** Upsert-by-(assetId, today) — at most one point per asset per calendar date, same pattern as portfolio_snapshots. */
  async recordToday(assetId: string, price: number): Promise<PriceHistoryPoint> {
    const today = todayISO();
    if (isDemoMode()) {
      const existing = demoPriceHistory.find((p) => p.assetId === assetId && p.recordedDate === today);
      if (existing) {
        existing.price = price;
        return existing;
      }
      const point: PriceHistoryPoint = { id: nextId("price"), assetId, price, recordedDate: today, createdAt: new Date().toISOString() };
      demoPriceHistory.push(point);
      return point;
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db
      .from("price_history")
      .upsert({ asset_id: assetId, price, recorded_date: today }, { onConflict: "asset_id,recorded_date" })
      .select()
      .single();
    if (error) throw error;
    return rowToPoint(data as PriceHistoryRow);
  },
};
