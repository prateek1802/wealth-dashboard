import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
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
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("price_history").select("*").eq("asset_id", assetId).order("recorded_date");
    if (error) throw error;
    return (data as PriceHistoryRow[]).map(rowToPoint);
  },

  /** Every point across every asset — used by backup.service.ts's export; price_history was previously omitted from backups entirely. */
  async findAll(): Promise<PriceHistoryPoint[]> {
    if (isDemoMode()) return [...demoPriceHistory];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("price_history").select("*").order("recorded_date");
    if (error) throw error;
    return (data as PriceHistoryRow[]).map(rowToPoint);
  },

  /** Upsert-by-(assetId, today) — at most one point per asset per calendar date, same pattern as portfolio_snapshots. */
  async recordToday(assetId: string, price: number): Promise<PriceHistoryPoint> {
    return this.recordForDate(assetId, price, todayISO());
  },

  /** Same upsert as recordToday but for an arbitrary date — used by backup.service.ts's restore, which needs to write historical points, not just today's. */
  async recordForDate(assetId: string, price: number, date: string): Promise<PriceHistoryPoint> {
    if (isDemoMode()) {
      const existing = demoPriceHistory.find((p) => p.assetId === assetId && p.recordedDate === date);
      if (existing) {
        existing.price = price;
        return existing;
      }
      const point: PriceHistoryPoint = { id: nextId("price"), assetId, price, recordedDate: date, createdAt: new Date().toISOString() };
      demoPriceHistory.push(point);
      return point;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("price_history")
      .upsert({ asset_id: assetId, price, recorded_date: date }, { onConflict: "asset_id,recorded_date" })
      .select()
      .single();
    if (error) throw error;
    return rowToPoint(data as PriceHistoryRow);
  },
};
