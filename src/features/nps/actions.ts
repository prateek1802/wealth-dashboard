"use server";
import { revalidatePath } from "next/cache";
import { npsService } from "@/lib/services/nps.service";
import { npsAccountSchema, npsContributionSchema, withdrawNPSSchema } from "@/lib/validation/nps.schema";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/features/transactions/actions";

export async function addNPSAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = npsAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await npsService.createAccount(parsed.data);
    revalidatePath(ROUTES.nps);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
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
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
