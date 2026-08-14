import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-safe exports only — no `next/headers` import here, so this file
 * can be imported from both Client and Server Components. The server-only
 * counterpart (which reads/writes the auth cookie via `next/headers`) is
 * getServerSupabaseClient in server-client.ts, imported only by
 * repositories (server-only files).
 *
 * DEMO MODE: when no Supabase project is configured, repositories fall
 * back to an in-memory seed dataset (see demo-data.ts) — no login
 * required. This is a development convenience only.
 *
 * AUTH: once a real Supabase project is connected, every request is
 * scoped to the signed-in user's own session, not a service-role key that
 * bypasses security. Row Level Security policies in supabase/schema.sql
 * do the actual enforcement — see server-client.ts and middleware.ts.
 */
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Client for use in Client Components — reads/writes the auth session cookie in the browser. */
export function getBrowserSupabaseClient(): SupabaseClient {
  if (isDemoMode()) {
    throw new Error("Supabase is not configured — this should not be called in demo mode.");
  }
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
