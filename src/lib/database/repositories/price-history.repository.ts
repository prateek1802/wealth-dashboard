import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoPriceHistory, nextId } from "@/lib/database/demo-data";
import { todayISO } from "@/lib/utils/date";
import type { PriceHistoryPoint } from "@/types/domain/price-history";
import type { PriceHistoryRow } from "@/types/database";

function rowToPoint(row: PriceHistoryRow): PriceHistoryPoint {
  return { id: row.id, assetId: row.asset_id, price: row.price, recordedDate: row.recorded_date, source: row.source, createdAt: row.created_at };
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

  /** Upsert-by-(assetId, today), source='manual' — at most one point per asset per calendar date, same pattern as portfolio_snapshots. */
  async recordToday(assetId: string, price: number): Promise<PriceHistoryPoint> {
    return this.recordForDate(assetId, price, todayISO());
  },

  /** Same upsert as recordToday but for an arbitrary date and (optionally) source — defaults to 'manual'. Used by backup.service.ts's restore, which needs to write historical points (preserving whatever source they were originally recorded with) rather than just today's. */
  async recordForDate(assetId: string, price: number, date: string, source: "manual" | "backfill" = "manual"): Promise<PriceHistoryPoint> {
    if (isDemoMode()) {
      const existing = demoPriceHistory.find((p) => p.assetId === assetId && p.recordedDate === date);
      if (existing) {
        existing.price = price;
        return existing;
      }
      const point: PriceHistoryPoint = { id: nextId("price"), assetId, price, recordedDate: date, source, createdAt: new Date().toISOString() };
      demoPriceHistory.push(point);
      return point;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("price_history")
      .upsert({ asset_id: assetId, price, recorded_date: date, source }, { onConflict: "asset_id,recorded_date" })
      .select()
      .single();
    if (error) throw error;
    return rowToPoint(data as PriceHistoryRow);
  },

  /**
   * Bulk upsert for a one-time historical backfill (see
   * lib/market-data/historical-provider.ts) — source='backfill', explicitly
   * distinct from the organically-collected 'manual' points (see
   * schema.sql's price_history comment for why the distinction exists).
   * Never overwrites an existing point (manual OR a prior backfill) for a
   * date that already has one — a real recorded price for that day takes
   * precedence, since a manual entry may reflect the user's own broker
   * statement rather than an API's EOD figure. Returns how many points were
   * actually newly inserted (not just fetched — some may already exist).
   */
  async recordBackfillBatch(assetId: string, points: { date: string; price: number }[]): Promise<number> {
    if (points.length === 0) return 0;
    if (isDemoMode()) {
      let inserted = 0;
      for (const p of points) {
        const existing = demoPriceHistory.find((x) => x.assetId === assetId && x.recordedDate === p.date);
        if (existing) continue;
        demoPriceHistory.push({ id: nextId("price"), assetId, price: p.price, recordedDate: p.date, source: "backfill", createdAt: new Date().toISOString() });
        inserted += 1;
      }
      return inserted;
    }
    const db = await getServerSupabaseClient();
    const existing = await db.from("price_history").select("recorded_date").eq("asset_id", assetId);
    if (existing.error) throw existing.error;
    const existingDates = new Set((existing.data as { recorded_date: string }[]).map((r) => r.recorded_date));
    const toInsert = points.filter((p) => !existingDates.has(p.date)).map((p) => ({ asset_id: assetId, price: p.price, recorded_date: p.date, source: "backfill" as const }));
    if (toInsert.length === 0) return 0;
    const { error } = await db.from("price_history").insert(toInsert);
    if (error) throw error;
    return toInsert.length;
  },
};
