"use server";
import { revalidatePath } from "next/cache";
import { liabilitiesService } from "@/lib/services/liabilities.service";
import { liabilitySchema } from "@/lib/validation/liability.schema";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/features/transactions/actions";

export async function addLiabilityAction(input: unknown): Promise<ActionResult> {
  const parsed = liabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await liabilitiesService.create(parsed.data);
    revalidatePath(ROUTES.liabilities);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function updateLiabilityAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = liabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await liabilitiesService.update(id, parsed.data);
    revalidatePath(ROUTES.liabilities);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteLiabilityAction(id: string): Promise<ActionResult> {
  try {
    await liabilitiesService.remove(id);
    revalidatePath(ROUTES.liabilities);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
