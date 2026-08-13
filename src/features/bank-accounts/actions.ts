"use server";
import { revalidatePath } from "next/cache";
import { bankAccountsService } from "@/lib/services/bank-accounts.service";
import { bankAccountSchema } from "@/lib/validation/bank-account.schema";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/features/transactions/actions";

export async function addBankAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = bankAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await bankAccountsService.create(parsed.data);
    revalidatePath(ROUTES.bankAccounts);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function updateBankAccountBalanceAction(id: string, currentBalance: number): Promise<ActionResult> {
  try {
    await bankAccountsService.updateBalance(id, currentBalance);
    revalidatePath(ROUTES.bankAccounts);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteBankAccountAction(id: string): Promise<ActionResult> {
  try {
    await bankAccountsService.remove(id);
    revalidatePath(ROUTES.bankAccounts);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
