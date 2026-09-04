"use server";
import { revalidatePath } from "next/cache";
import { auditService } from "@/lib/services/audit.service";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import type { ActionResult } from "@/features/transactions/actions";

/** Which page(s) show data from a given audited table — revalidated after a restore so the restored record shows up immediately, not just in the audit log. */
const TABLE_TO_ROUTES: Record<string, readonly string[]> = {
  transactions: [ROUTES.transactions, ROUTES.portfolio],
  assets: [ROUTES.portfolio],
  fixed_deposits: [ROUTES.fixedDeposits],
  bank_accounts: [ROUTES.bankAccounts],
  ppf_accounts: [ROUTES.ppf],
  liabilities: [ROUTES.liabilities],
  goals: [ROUTES.goals],
  nps_accounts: [ROUTES.nps],
  nps_contributions: [ROUTES.nps],
  nps_scheme_transactions: [ROUTES.nps],
};

export async function restoreAuditLogEntryAction(auditLogId: string): Promise<ActionResult> {
  try {
    const { tableName } = await auditService.restore(auditLogId);
    revalidatePath(ROUTES.auditLog);
    revalidatePath(ROUTES.dashboard);
    for (const route of TABLE_TO_ROUTES[tableName] ?? []) revalidatePath(route);
    return { ok: true };
  } catch (err) {
    logServerError("restoreAuditLogEntryAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Restore failed" };
  }
}
