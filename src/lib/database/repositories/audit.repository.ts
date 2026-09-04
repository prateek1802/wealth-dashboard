import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import type { AuditLogEntry } from "@/types/domain/audit";
import type { AuditLogRow } from "@/types/database";

function rowToEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action as AuditLogEntry["action"],
    oldData: row.old_data,
    newData: row.new_data,
    changedAt: row.changed_at,
  };
}

/**
 * The audit_log TABLE ITSELF is read-only by design — every row is written
 * by the fn_audit_log() DB trigger (see supabase/schema.sql), never by app
 * code, so there is no create/update/delete of an audit_log row here, to
 * keep the trail tamper-proof from the app's own side. restore() below is
 * a different concern: it READS an audit_log entry and writes to the
 * ENTITY'S OWN table (transactions, assets, goals, ...), not to audit_log
 * itself — the audit trail's own integrity is unaffected.
 *
 * DEMO MODE: the in-memory demo dataset (demo-data.ts) has no trigger
 * layer to populate this from, so demo mode always returns an empty
 * list — an honest reflection of "no history exists here," not a bug.
 */
export const auditRepository = {
  async findRecent(limit: number = 100): Promise<AuditLogEntry[]> {
    if (isDemoMode()) return [];
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("audit_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as AuditLogRow[]).map(rowToEntry);
  },

  async findById(id: string): Promise<AuditLogEntry | null> {
    if (isDemoMode()) return null;
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("audit_log").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToEntry(data as AuditLogRow) : null;
  },

  async findForRecord(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
    if (isDemoMode()) return [];
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("audit_log")
      .select("*")
      .eq("table_name", tableName)
      .eq("record_id", recordId)
      .order("changed_at", { ascending: false });
    if (error) throw error;
    return (data as AuditLogRow[]).map(rowToEntry);
  },

  /**
   * Undo window for deletes — re-inserts a deleted record's EXACT snapshot
   * (old_data, captured by fn_audit_log() at the moment it was deleted)
   * back into its original table, id and all. Only 'delete' entries are
   * restorable — an 'update' entry's old_data is the pre-edit state, and
   * "undo an edit" is a different feature (not built).
   *
   * old_data's keys already match the target table's own column names
   * exactly (it's a raw `to_jsonb(old)` snapshot from Postgres), so this
   * is a direct re-insert, not a field-by-field reconstruction. No
   * whitelist of restorable tables is needed beyond "was this ever
   * audited" — RLS on the target table already only allows this to
   * succeed for the current user's own row (old_data.user_id), and a
   * foreign key that no longer exists (e.g. restoring a transaction whose
   * asset was deleted and never itself restored) fails loudly with
   * Postgres's own constraint error rather than silently succeeding into
   * a broken state.
   *
   * A schema change between the original delete and now (a column added
   * or removed since) can make an old snapshot no longer insertable as-is
   * — a known, rare edge case, not handled specially.
   */
  async restore(auditLogId: string): Promise<{ tableName: string; recordId: string }> {
    const entry = await this.findById(auditLogId);
    if (!entry) throw new Error("That audit log entry no longer exists.");
    if (entry.action !== "delete") throw new Error("Only a deleted record can be restored.");
    if (!entry.oldData) throw new Error("No snapshot was captured for this entry — nothing to restore.");

    const db = await getServerSupabaseClient();
    const { error } = await db.from(entry.tableName).insert(entry.oldData);
    if (error) {
      if (error.code === "23505") throw new Error("This record already exists — it looks like it was already restored.");
      throw error;
    }
    return { tableName: entry.tableName, recordId: entry.recordId };
  },
};
