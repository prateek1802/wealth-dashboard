/**
 * Before this, every Server Action's catch block silently swallowed the
 * real error into a generic user-facing message — nothing was ever logged
 * server-side, so a genuine failure (a Supabase constraint violation, a
 * network error, anything) left no trace to debug from. No external
 * logging service needed: a plain console.error, called consistently with
 * useful context, is already captured by Vercel's own log aggregation
 * (visible in the project's Logs tab) for any app deployed there.
 *
 * `context` should identify which action failed (e.g. "addTransactionAction")
 * so a log line is actually traceable back to a call site.
 */
export function logServerError(context: string, err: unknown): void {
  console.error(`[${context}]`, err);
}

/**
 * More robust than `err instanceof Error ? err.message : "..."` — that
 * pattern was found returning a bare fallback string with zero diagnostic
 * detail for a real production failure (775 asset rows in one backup
 * restore, every one showing just "failed"). Empirically, this project's
 * installed @supabase/postgrest-js (2.112.2) DOES make PostgrestError
 * extend Error, so `instanceof Error` isn't wrong on its face here — but
 * relying on that check breaks silently for ANYTHING that isn't a real
 * Error instance (a thrown plain object, string, undefined, or an error
 * shape that changes across a serialization boundary), and gives no clue
 * why when it does. This duck-types instead: use `.message` if present
 * (covers Error instances AND plain PostgrestError-shaped objects alike),
 * otherwise fall back to stringifying whatever was actually thrown —
 * always shows SOMETHING real, never just a fixed fallback word.
 */
export function getErrorMessage(err: unknown, fallback: string = "Something went wrong"): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") return err;
  if (err === null || err === undefined) return fallback;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}
