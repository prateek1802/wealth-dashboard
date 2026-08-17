"use server";
import { revalidatePath } from "next/cache";
import { backupService } from "@/lib/services/backup.service";
import type { WealthBackup, BackupImportSummary } from "@/lib/services/backup.service";
import { ROUTES } from "@/constants/routes";

export async function exportBackupAction(): Promise<WealthBackup> {
  return backupService.exportAll();
}

export async function importBackupAction(
  backup: unknown
): Promise<{ ok: true; summary: BackupImportSummary } | { ok: false; error: string }> {
  if (typeof backup !== "object" || backup === null || !("formatVersion" in backup)) {
    return { ok: false, error: "That doesn't look like a Wealth backup file — expected a JSON object with a formatVersion field." };
  }
  try {
    const summary = await backupService.importAll(backup as WealthBackup);
    // Touch every route that reads from the repositories this just wrote to.
    for (const path of [
      ROUTES.dashboard, ROUTES.portfolio, ROUTES.transactions, ROUTES.analytics,
      ROUTES.goals, ROUTES.bankAccounts, ROUTES.fixedDeposits, ROUTES.nps, ROUTES.ppf, ROUTES.watchlist,
    ]) {
      revalidatePath(path);
    }
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed" };
  }
}
