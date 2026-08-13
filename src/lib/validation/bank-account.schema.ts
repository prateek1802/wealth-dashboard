import { z } from "zod";
import { BANK_ACCOUNT_TYPES } from "@/constants/bank-accounts";

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1, "Bank name is required").max(200),
  accountType: z.enum(BANK_ACCOUNT_TYPES),
  currentBalance: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
