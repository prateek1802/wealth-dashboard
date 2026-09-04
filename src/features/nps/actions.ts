"use server";
import { revalidatePath } from "next/cache";
import { npsService } from "@/lib/services/nps.service";
import { parseNPSStatement } from "@/lib/import/nps-statement-parser";
import { npsAccountSchema, npsContributionSchema, withdrawNPSSchema } from "@/lib/validation/nps.schema";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import type { ActionResult } from "@/features/transactions/actions";
import type { NPSImportSummary } from "@/lib/services/nps.service";
import type { NPSScheme } from "@/constants/nps";

export async function addNPSAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = npsAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await npsService.createAccount(parsed.data);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("addNPSAccountAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function updateNPSAssumptionsAction(accountId: string, input: unknown): Promise<ActionResult> {
  const parsed = npsAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await npsService.updateAssumptions(accountId, parsed.data);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("updateNPSAssumptionsAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteNPSAccountAction(id: string): Promise<ActionResult> {
  try {
    await npsService.removeAccount(id);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("deleteNPSAccountAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function withdrawNPSAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = withdrawNPSSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await npsService.withdraw(id, parsed.data.amount);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("withdrawNPSAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function addNPSContributionAction(input: unknown): Promise<ActionResult> {
  const parsed = npsContributionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await npsService.addContribution({ ...parsed.data, notes: parsed.data.notes ?? null });
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("addNPSContributionAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

const MAX_STATEMENT_FILE_BYTES = 15 * 1024 * 1024; // 15MB — generous headroom over a multi-year statement

/**
 * Imports a real NPS statement (NSDL/Protean export) for one account.
 * Accepts .xlsx (consolidated, multi-sheet — Format B, validated against a
 * real subscriber's data) or .csv (single-period CRA export — Format A,
 * best-effort, see lib/import/nps-statement-parser.ts for caveats).
 * Idempotent: safe to import the same or an overlapping file more than
 * once — see npsService.importStatement().
 */
export async function importNPSStatementAction(npsAccountId: string, formData: FormData): Promise<{ ok: true; summary: NPSImportSummary } | { ok: false; error: string }> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file was provided." };
    if (file.size === 0) return { ok: false, error: "That file is empty." };
    if (file.size > MAX_STATEMENT_FILE_BYTES) return { ok: false, error: "That file is larger than expected for an NPS statement — please double-check it." };

    const name = file.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || file.type.includes("spreadsheet");
    const isCsv = name.endsWith(".csv") || file.type.includes("csv");
    if (!isXlsx && !isCsv) return { ok: false, error: "Please upload the .xlsx (consolidated) or .csv (single-period) statement exported from NSDL/Protean." };

    const parseResult = isXlsx ? parseNPSStatement({ kind: "xlsx", data: await file.arrayBuffer() }) : parseNPSStatement({ kind: "csv", text: await file.text() });

    if (Object.keys(parseResult.schemes).length === 0) {
      return { ok: false, error: "Couldn't find any recognizable scheme data (E/C/G/A) in that file." };
    }

    const summary = await npsService.importStatement(npsAccountId, parseResult);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true, summary };
  } catch (err) {
    logServerError("importNPSStatementAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong while reading that file." };
  }
}

/** Free-text search over npsnav.in's scheme index — backs the "connect live NAV" search UI. */
export async function searchNPSNAVSchemesAction(query: string) {
  return npsService.searchNPSNAVSchemes(query);
}

/** Records (or clears, if schemeCode is null) which npsnav.in scheme a held scheme maps to. */
export async function linkSchemeToNAVSourceAction(npsAccountId: string, scheme: NPSScheme, schemeCode: string | null): Promise<ActionResult> {
  try {
    await npsService.linkSchemeToNAVSource(npsAccountId, scheme, schemeCode);
    revalidatePath(ROUTES.nps);
    return { ok: true };
  } catch (err) {
    logServerError("linkSchemeToNAVSourceAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

/** Refreshes live NAV for every scheme in one account that's been connected to a npsnav.in scheme_code. */
export async function refreshNPSLiveNAVsAction(npsAccountId: string): Promise<{ ok: true; updated: number; skipped: number; failed: number } | { ok: false; error: string }> {
  try {
    const result = await npsService.refreshLiveNAVs(npsAccountId);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true, ...result };
  } catch (err) {
    logServerError("refreshNPSLiveNAVsAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

/** Refreshes live NAV for every connected scheme across every NPS account — used by the Dashboard's "Refresh all" button. */
export async function refreshAllNPSLiveNAVsAction(): Promise<{ ok: true; updated: number; skipped: number; failed: number } | { ok: false; error: string }> {
  try {
    const result = await npsService.refreshAllLiveNAVs();
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true, ...result };
  } catch (err) {
    logServerError("refreshAllNPSLiveNAVsAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
