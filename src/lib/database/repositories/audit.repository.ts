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
 * Read-only by design — every row here is written by the fn_audit_log() DB
 * trigger (see supabase/schema.sql), never by app code, so there is no
 * create/update/delete here to keep the trail tamper-proof from the app's
 * own side.
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
};
