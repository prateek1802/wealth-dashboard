import type { AuditLogEntry } from "@/types/domain/audit";

/** Fields not worth showing in a diff — noisy or redundant with changedAt itself. */
const HIDDEN_FIELDS = new Set(["id", "user_id", "created_at", "updated_at"]);

export interface DiffRow {
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

export function formatFieldValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Rows to show for one audit entry: for an update, only the fields that
 * actually changed; for a delete, every field that existed on the deleted
 * row (before === after, since there's nothing to compare against).
 */
export function buildDiffRows(entry: Pick<AuditLogEntry, "action" | "oldData" | "newData">): DiffRow[] {
  const before = entry.oldData ?? {};
  const after = entry.newData ?? {};
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows: DiffRow[] = [];
  for (const field of fields) {
    if (HIDDEN_FIELDS.has(field)) continue;
    const beforeVal = formatFieldValue(before[field]);
    const afterVal = entry.action === "delete" ? beforeVal : formatFieldValue(after[field]);
    const changed = beforeVal !== afterVal;
    if (entry.action === "update" && !changed) continue;
    rows.push({ field, before: beforeVal, after: afterVal, changed });
  }
  return rows.sort((a, b) => a.field.localeCompare(b.field));
}
