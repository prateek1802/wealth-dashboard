import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/database/admin-client";
import { rowToAsset } from "@/lib/database/asset-mapping";
import { rowToTransaction } from "@/lib/database/repositories/transactions.repository";
import { computeHoldingsFrom } from "@/lib/services/portfolio.service";
import { fetchHistoricalPricesForAsset, BACKFILLABLE_ASSET_TYPES } from "@/lib/market-data/historical-provider";
import type { AssetRow, TransactionRow } from "@/types/database";

export const maxDuration = 60; // Vercel Hobby plan's ceiling — see refresh-prices/route.ts's identical note. This job's per-asset payloads (a fund's ENTIRE NAV history, refetched in full each run) are heavier than a single live quote, so this is more likely to bump into the cap as holdings grow — if that happens, the fix is to make historical-provider.ts's fetchers accept a since-date and request only the gap, not to raise this further.

/**
 * Scheduled via vercel.json at 16:00 UTC / 21:30 IST, every day including
 * weekends (unlike refresh-prices' weekday-only schedule) — mutual fund
 * NAVs are typically published through the evening, and crypto trades
 * 24/7, so there's no "market closed" day to skip the way there is for
 * equities. Automates what the "Backfill All History" button (Holdings
 * hub) does on demand, so historical price_history stays topped up
 * without the user remembering to click it. Mirrors refresh-prices/
 * route.ts's structure closely (admin client, same userId-from-existing-
 * row trick, same CRON_SECRET auth) — see that file's comments for why
 * each piece exists.
 *
 * Deliberately NOT a full daily refetch's worth of NEW work most days:
 * fetchHistoricalPricesForAsset() returns an asset's entire available
 * series every time (no since-date param — see that module's doc
 * comment), but this route only INSERTs points for dates not already in
 * price_history, so a day where nothing changed costs one external fetch
 * per holding but zero new rows. The dedup is what actually matters here,
 * not the fetch size — worth revisiting only if holdings count or
 * maxDuration becomes a real constraint (see the comment above).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminSupabaseClient();

    const [{ data: assetRows, error: assetsError }, { data: txnRows, error: txnError }] = await Promise.all([
      db.from("assets").select("*").eq("is_active", true),
      db.from("transactions").select("*"),
    ]);
    if (assetsError) throw assetsError;
    if (txnError) throw txnError;

    const userId = (assetRows as (AssetRow & { user_id: string })[])[0]?.user_id;
    if (!userId) {
      return NextResponse.json({ ok: true, assetsBackfilled: 0, totalPointsAdded: 0, note: "No assets exist yet — nothing to backfill.", ranAt: new Date().toISOString() });
    }

    const assets = (assetRows as AssetRow[]).map(rowToAsset);
    const transactions = (txnRows as TransactionRow[]).map(rowToTransaction);
    const holdings = computeHoldingsFrom(assets, transactions).filter((h) => h.quantity > 1e-9);
    const targets = holdings.filter((h) => (BACKFILLABLE_ASSET_TYPES as readonly string[]).includes(h.asset.assetType));

    let assetsBackfilled = 0;
    let totalPointsAdded = 0;

    for (const holding of targets) {
      const asset = holding.asset;
      const points = await fetchHistoricalPricesForAsset(asset);
      if (points.length === 0) continue;

      const { data: existingRows, error: existingError } = await db.from("price_history").select("recorded_date").eq("asset_id", asset.id);
      if (existingError) throw existingError;
      const existingDates = new Set((existingRows as { recorded_date: string }[]).map((r) => r.recorded_date));

      const toInsert = points.filter((p) => !existingDates.has(p.date)).map((p) => ({ user_id: userId, asset_id: asset.id, price: p.price, recorded_date: p.date, source: "backfill" as const }));
      if (toInsert.length === 0) continue;

      const { error: insertError } = await db.from("price_history").insert(toInsert);
      if (insertError) throw insertError;

      assetsBackfilled += 1;
      totalPointsAdded += toInsert.length;
    }

    return NextResponse.json({ ok: true, assetsBackfilled, totalPointsAdded, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[cron:backfill-history]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Backfill failed" }, { status: 500 });
  }
}
