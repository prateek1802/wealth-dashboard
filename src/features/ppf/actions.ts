"use server";
import { revalidatePath } from "next/cache";
import { ppfService } from "@/lib/services/ppf.service";
import { ppfAccountSchema, withdrawPPFSchema } from "@/lib/validation/ppf.schema";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/features/transactions/actions";

export async function addPPFAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = ppfAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await ppfService.create(parsed.data);
    revalidatePath(ROUTES.ppf);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function updatePPFBalanceAction(id: string, currentBalance: number, totalContributed: number): Promise<ActionResult> {
  try {
    await ppfService.updateBalance(id, currentBalance, totalContributed);
    revalidatePath(ROUTES.ppf);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function withdrawPPFAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = withdrawPPFSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await ppfService.withdraw(id, parsed.data.amount);
    revalidatePath(ROUTES.ppf);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deletePPFAccountAction(id: string): Promise<ActionResult> {
  try {
    await ppfService.remove(id);
    revalidatePath(ROUTES.ppf);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
