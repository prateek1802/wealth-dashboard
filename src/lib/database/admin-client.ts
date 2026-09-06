import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE ROLE client — bypasses RLS entirely. This is deliberately
 * separate from server-client.ts's getServerSupabaseClient(): that one is
 * cookie-based, acting as whichever user's session is attached to the
 * current request, which is exactly right for every normal user-facing
 * repository call. A Vercel Cron invocation has no browser cookies at
 * all — there is no "current user" to act as — so the cookie-based client
 * would resolve to the anonymous role there and RLS would silently block
 * every query. This client is for that one situation only.
 *
 * NEVER import this from a repository, Server Action, or anything a
 * normal user-facing request path touches — those must keep going through
 * getServerSupabaseClient() so RLS still applies per-user. As of this
 * writing, the only caller is src/app/api/cron/refresh-prices/route.ts.
 *
 * This app is single-user (see ARCHITECTURE.md) — this client isn't
 * scoping "which user" the cron job acts on, because there's only one.
 */
export function getAdminSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("getAdminSupabaseClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
