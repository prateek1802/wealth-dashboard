"use server";
import { revalidatePath } from "next/cache";
import { goalsRepository } from "@/lib/database/repositories/goals.repository";
import { goalSchema } from "@/lib/validation/goal.schema";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import type { ActionResult } from "@/features/transactions/actions";

export async function addGoalAction(input: unknown): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await goalsRepository.create({ ...parsed.data, targetDate: parsed.data.targetDate ?? null, category: parsed.data.category ?? null, description: parsed.data.description ?? null });
    revalidatePath(ROUTES.goals);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("addGoalAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function updateGoalAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await goalsRepository.update(id, { ...parsed.data, targetDate: parsed.data.targetDate ?? null, category: parsed.data.category ?? null, description: parsed.data.description ?? null });
    revalidatePath(ROUTES.goals);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("updateGoalAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  try {
    await goalsRepository.delete(id);
    revalidatePath(ROUTES.goals);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("deleteGoalAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
