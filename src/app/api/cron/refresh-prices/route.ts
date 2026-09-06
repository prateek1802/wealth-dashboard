import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/database/admin-client";
import { rowToAsset } from "@/lib/database/asset-mapping";
import { rowToTransaction } from "@/lib/database/repositories/transactions.repository";
import { computeHoldingsFrom } from "@/lib/services/portfolio.service";
import { getLiveQuoteForAsset } from "@/lib/market-data/live-provider";
import { todayISO } from "@/lib/utils/date";
import type { AssetRow, TransactionRow } from "@/types/database";

export const maxDuration = 60; // Vercel Hobby plan's ceiling. Sequential per-asset fetches (deliberately rate-limit-friendly — see live-provider.ts) can take a while with many holdings; this is the longest a Hobby-tier function is allowed to run.

/**
 * Scheduled via vercel.json for weekday IST market close (+ a small buffer
 * for providers to publish final EOD prices) — see that file for the
 * exact cron expression and why. Fixes the documented V1 trade-off (see
 * ARCHITECTURE.md): before this, prices only ever refreshed when someone
 * opened the app and clicked refresh, never automatically.
 *
 * Protected by CRON_SECRET (Vercel's own documented mechanism — set the
 * env var in the project, and Vercel automatically sends
 * `Authorization: Bearer <value>` on every invocation it triggers; nothing
 * custom to build here beyond checking that header matches).
 *
 * Uses an ADMIN client (see admin-client.ts), not the normal cookie-based
 * repository layer — a cron invocation has no user session/cookies, so
 * assetsRepository/transactionsRepository would silently see nothing
 * (RLS blocking an anonymous request) rather than erroring loudly. This
 * app is single-user (see ARCHITECTURE.md), so "refresh everyone's
 * prices" and "refresh the one user's prices" are the same operation here.
 *
 * Scoped to actual HOLDINGS (quantity > 0), same as the dashboard's
 * manual "Refresh all" button — NOT every active asset, so a watchlist-only
 * symbol doesn't silently consume free-tier API rate limits daily for a
 * symbol the user is just casually tracking. NPS is NOT refreshed here —
 * NPS NAVs are typically published the next business day, not at same-day
 * market close, so "at market close" doesn't apply to them the same way;
 * NPS's own refresh path (refreshAllNPSLiveNAVsAction) is untouched by
 * this route entirely.
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

    const assets = (assetRows as AssetRow[]).map(rowToAsset);
    const transactions = (txnRows as TransactionRow[]).map(rowToTransaction);
    const holdings = computeHoldingsFrom(assets, transactions).filter((h) => h.quantity > 1e-9);

    const today = todayISO();
    let updated = 0;
    const skipped: string[] = [];

    for (const holding of holdings) {
      const asset = holding.asset;
      const quote = await getLiveQuoteForAsset(asset);
      if (!quote) {
        skipped.push(asset.symbol);
        continue;
      }
      const { error: updateError } = await db
        .from("assets")
        .update({ current_price: quote.price, current_price_updated_at: new Date().toISOString() })
        .eq("id", asset.id);
      if (updateError) throw updateError;

      const { error: historyError } = await db
        .from("price_history")
        .upsert({ asset_id: asset.id, price: quote.price, recorded_date: today }, { onConflict: "asset_id,recorded_date" });
      if (historyError) throw historyError;

      updated += 1;
    }

    return NextResponse.json({ ok: true, updated, skipped, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[cron:refresh-prices]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Refresh failed" }, { status: 500 });
  }
}
