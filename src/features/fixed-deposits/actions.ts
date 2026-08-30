"use server";
import { revalidatePath } from "next/cache";
import { fdService } from "@/lib/services/fd.service";
import { fixedDepositSchema, withdrawFixedDepositSchema } from "@/lib/validation/fd.schema";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import type { ActionResult } from "@/features/transactions/actions";

export async function addFixedDepositAction(input: unknown): Promise<ActionResult> {
  const parsed = fixedDepositSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await fdService.create({ ...parsed.data, maturityAmount: null, notes: parsed.data.notes ?? null });
    revalidatePath(ROUTES.fixedDeposits);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("addFixedDepositAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function editFixedDepositAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = fixedDepositSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const { fixedDepositsRepository } = await import("@/lib/database/repositories/fixed-deposits.repository");
    await fixedDepositsRepository.update(id, { ...parsed.data, maturityAmount: null, notes: parsed.data.notes ?? null });
    revalidatePath(ROUTES.fixedDeposits);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("editFixedDepositAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function withdrawFixedDepositAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = withdrawFixedDepositSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await fdService.withdraw(id, parsed.data.withdrawalDate, parsed.data.withdrawalAmount);
    revalidatePath(ROUTES.fixedDeposits);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("withdrawFixedDepositAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteFixedDepositAction(id: string): Promise<ActionResult> {
  try {
    await fdService.remove(id);
    revalidatePath(ROUTES.fixedDeposits);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    logServerError("deleteFixedDepositAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
