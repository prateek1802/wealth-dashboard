import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client factory. Repositories are the ONLY layer that
 * imports this file — no UI or service code talks to Supabase directly.
 *
 * DEMO MODE: when no Supabase project is configured (no env vars set),
 * repositories fall back to an in-memory seed dataset (see demo-data.ts)
 * so the app is fully explorable before you connect a real database.
 * This is a development convenience only — see SETUP.md to connect a
 * real Supabase project, which is required for anything to persist.
 */
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

let browserClient: SupabaseClient | null = null;

/** Client for use in Client Components (anon key only, respects future RLS). */
export function getBrowserSupabaseClient(): SupabaseClient {
  if (isDemoMode()) {
    throw new Error("Supabase is not configured — this should not be called in demo mode.");
  }
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

/**
 * Client for use in Server Components / Server Actions. Uses the
 * service-role key when present (server-only env var, never exposed to
 * the browser) so V1's single-user app isn't blocked by RLS that doesn't
 * exist yet; falls back to the anon key otherwise. See ARCHITECTURE.md
 * "Security" for what changes here once auth is introduced.
 */
export function getServerSupabaseClient(): SupabaseClient {
  if (isDemoMode()) {
    throw new Error("Supabase is not configured — this should not be called in demo mode.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
