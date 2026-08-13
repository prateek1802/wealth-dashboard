import { z } from "zod";

export const ppfAccountSchema = z.object({
  accountNumber: z.string().trim().max(50).nullable().default(null),
  currentBalance: z.coerce.number().nonnegative(),
  totalContributed: z.coerce.number().nonnegative(),
  interestRate: z.coerce.number().positive().max(20),
  openDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  yearlyContribution: z.coerce.number().nonnegative().nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export const withdrawPPFSchema = z.object({
  amount: z.coerce.number().positive("Withdrawal amount must be greater than zero"),
});

export type PPFAccountInput = z.infer<typeof ppfAccountSchema>;
