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
