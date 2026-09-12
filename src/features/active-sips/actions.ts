"use server";
import { revalidatePath } from "next/cache";
import { activeSipsRepository } from "@/lib/database/repositories/active-sips.repository";
import { activeSipSchema } from "@/lib/validation/active-sip.schema";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import type { ActionResult } from "@/features/transactions/actions";

export async function addActiveSipAction(input: unknown): Promise<ActionResult> {
  const parsed = activeSipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await activeSipsRepository.create(parsed.data);
    revalidatePath(ROUTES.analytics);
    return { ok: true };
  } catch (err) {
    logServerError("addActiveSipAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function stopActiveSipAction(id: string): Promise<ActionResult> {
  try {
    await activeSipsRepository.markStopped(id);
    revalidatePath(ROUTES.analytics);
    return { ok: true };
  } catch (err) {
    logServerError("stopActiveSipAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteActiveSipAction(id: string): Promise<ActionResult> {
  try {
    await activeSipsRepository.delete(id);
    revalidatePath(ROUTES.analytics);
    return { ok: true };
  } catch (err) {
    logServerError("deleteActiveSipAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
