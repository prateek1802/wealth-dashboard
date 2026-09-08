import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/database/admin-client";
import { rowToAsset } from "@/lib/database/asset-mapping";
import { rowToTransaction } from "@/lib/database/repositories/transactions.repository";
import { computeHoldingsFrom } from "@/lib/services/portfolio.service";
import { getLiveQuoteForAsset } from "@/lib/market-data/live-provider";
import { todayISO } from "@/lib/utils/date";
import type { AssetRow, TransactionRow } from "@/types/database";

export const maxDuration = 60; // Vercel Hobby plan's ceiling. Sequential per-item fetches (deliberately rate-limit-friendly — see live-provider.ts) can take a while with many holdings; this is the longest a Hobby-tier function is allowed to run.

interface SecuritiesRefreshResult {
  updated: number;
  skipped: string[];
}

interface NPSRefreshResult {
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Mirrors npsService.refreshAllLiveNAVs()'s exact logic (see
 * nps.service.ts's refreshLiveNAVs) — same field mapping, same
 * skip/fail semantics — but reading/writing via the ADMIN client passed
 * in, not npsRepository's cookie-based one. That repository's own methods
 * are hard-wired to getServerSupabaseClient() (cookie-based); called from
 * this sessionless cron context they'd see zero rows under RLS and report
 * a hollow "success" that refreshed nothing. Rather than touch
 * nps.repository.ts / nps.service.ts at all (none of NPS's own schema,
 * import, or classification logic changes here), this is a small,
 * parallel implementation for this one admin-client context, reusing the
 * pure, already-tested fetchNPSNAVQuote() unchanged.
 *
 * One query across every account's scheme holdings, rather than looping
 * per-account the way refreshAllLiveNAVs() does — behaviorally identical
 * (every holding still gets exactly one attempt), just flattened since
 * there's no need to fetch accounts separately first here.
 *
 * The UPDATE below never touches user_id (same as the assets price
 * update in this route) — it's an UPDATE on an existing row, which never
 * triggers a column's `default auth.uid()`, so no INSERT-only NOT NULL
 * issue applies here at all. Checked, not assumed.
 */
async function refreshNPSLiveNAVs(db: SupabaseClient): Promise<NPSRefreshResult> {
  const { fetchNPSNAVQuote } = await import("@/lib/market-data/live-provider");
  const { data, error } = await db.from("nps_scheme_holdings").select("nps_account_id, scheme, npsnav_scheme_code");
  if (error) throw error;

  const holdings = data as { nps_account_id: string; scheme: string; npsnav_scheme_code: string | null }[];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const holding of holdings) {
    if (!holding.npsnav_scheme_code) {
      skipped += 1;
      continue;
    }
    const quote = await fetchNPSNAVQuote(holding.npsnav_scheme_code);
    if (!quote) {
      failed += 1;
      continue;
    }
    const { error: updateError } = await db
      .from("nps_scheme_holdings")
      .update({ last_nav: quote.nav, last_nav_date: quote.asOf.slice(0, 10) })
      .eq("nps_account_id", holding.nps_account_id)
      .eq("scheme", holding.scheme);
    if (updateError) throw updateError;
    updated += 1;
  }

  return { updated, skipped, failed };
}

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
 * assetsRepository/transactionsRepository/npsRepository would silently
 * see nothing (RLS blocking an anonymous request) rather than erroring
 * loudly. This app is single-user (see ARCHITECTURE.md), so "refresh
 * everyone's prices" and "refresh the one user's prices" are the same
 * operation here.
 *
 * Securities are scoped to actual HOLDINGS (quantity > 0), same as the
 * dashboard's manual "Refresh all" button — NOT every active asset, so a
 * watchlist-only symbol doesn't silently consume free-tier API rate
 * limits daily for a symbol the user is just casually tracking.
 *
 * NPS live NAVs are refreshed too (added after securities-only shipped —
 * see refreshNPSLiveNAVs() above), run sequentially AFTER the securities
 * refresh, not in parallel — consistent with this app's existing
 * rate-limit-conscious pattern (live-provider.ts) of not bursting free
 * external APIs.
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

    // The one thing an admin (service-role) client can't get for free that
    // a normal cookie-based request can: there's no session, so
    // price_history's `user_id default auth.uid()` has nothing to read and
    // the insert fails NOT NULL (confirmed in production). This app is
    // single-user, so any existing row already carries the one real
    // user_id — reusing it from data already fetched above (no extra
    // query) rather than assuming a value.
    const userId = (assetRows as (AssetRow & { user_id: string })[])[0]?.user_id;
    if (!userId) {
      return NextResponse.json({ ok: true, securities: { updated: 0, skipped: [] }, nps: { updated: 0, skipped: 0, failed: 0 }, note: "No assets exist yet — nothing to refresh.", ranAt: new Date().toISOString() });
    }

    const assets = (assetRows as AssetRow[]).map(rowToAsset);
    const transactions = (txnRows as TransactionRow[]).map(rowToTransaction);
    const holdings = computeHoldingsFrom(assets, transactions).filter((h) => h.quantity > 1e-9);

    const today = todayISO();
    const securities: SecuritiesRefreshResult = { updated: 0, skipped: [] };

    for (const holding of holdings) {
      const asset = holding.asset;
      const quote = await getLiveQuoteForAsset(asset);
      if (!quote) {
        securities.skipped.push(asset.symbol);
        continue;
      }
      // UPDATE, not INSERT — the row already has its own user_id from
      // when it was created, untouched by this. Only INSERT triggers a
      // column's `default auth.uid()`, which is what actually needed the
      // explicit userId below (price_history.upsert()).
      const { error: updateError } = await db
        .from("assets")
        .update({ current_price: quote.price, current_price_updated_at: new Date().toISOString() })
        .eq("id", asset.id);
      if (updateError) throw updateError;

      const { error: historyError } = await db
        .from("price_history")
        .upsert({ user_id: userId, asset_id: asset.id, price: quote.price, recorded_date: today }, { onConflict: "asset_id,recorded_date" });
      if (historyError) throw historyError;

      securities.updated += 1;
    }

    const nps = await refreshNPSLiveNAVs(db);

    return NextResponse.json({ ok: true, securities, nps, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[cron:refresh-prices]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Refresh failed" }, { status: 500 });
  }
}
