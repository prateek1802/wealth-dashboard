import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isDemoMode } from "./client";

/**
 * Server-only client — imported exclusively by repositories (and nothing
 * that could end up in a Client Component bundle; the `server-only`
 * import above makes that a build error if it ever happens by accident).
 * Cookie-aware, so it acts as the currently signed-in user (RLS applies)
 * rather than a privileged service-role client. Must be awaited —
 * `cookies()` is async.
 */
export async function getServerSupabaseClient(): Promise<SupabaseClient> {
  if (isDemoMode()) {
    throw new Error("Supabase is not configured — this should not be called in demo mode.");
  }
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written — middleware.ts refreshes the session on every request
          // instead, so this is safe to ignore here.
        }
      },
    },
  });
}
