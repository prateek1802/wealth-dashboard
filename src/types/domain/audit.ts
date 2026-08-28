/**
 * A single row from audit_log — written exclusively by the fn_audit_log()
 * DB trigger (see supabase/schema.sql), never by app code. Read-only from
 * the app's perspective: there is deliberately no create/update/delete
 * repository method for this type.
 */
export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: "update" | "delete";
  /** Full row before the change. Always present for both update and delete. */
  oldData: Record<string, unknown> | null;
  /** Full row after the change. Present for update, always null for delete. */
  newData: Record<string, unknown> | null;
  changedAt: string;
}

/** Human-readable label for a table_name value, for the audit trail UI. */
export const AUDIT_TABLE_LABELS: Record<string, string> = {
  transactions: "Transaction",
  assets: "Investment",
  fixed_deposits: "Fixed Deposit",
  bank_accounts: "Bank Account",
  ppf_accounts: "PPF Account",
  liabilities: "Liability",
  goals: "Goal",
  nps_accounts: "NPS Account",
  nps_contributions: "NPS Contribution",
  nps_scheme_transactions: "NPS Scheme Transaction",
};
