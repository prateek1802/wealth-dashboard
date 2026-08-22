import { z } from "zod";
import { NPS_TIERS, NPS_SCHEME_PREFERENCES } from "@/constants/nps";

export const npsAccountSchema = z.object({
  tier: z.enum(NPS_TIERS),
  pensionFundManager: z.string().trim().max(200).nullable().default(null),
  schemePreference: z.enum(NPS_SCHEME_PREFERENCES).nullable().default(null),
  pran: z.string().trim().max(20).nullable().default(null),
  currentCorpus: z.coerce.number().nonnegative().default(0),
  expectedAnnualReturn: z.coerce.number().positive().max(30).nullable().default(null),
  monthlyContribution: z.coerce.number().nonnegative().nullable().default(null),
  annualContributionIncrease: z.coerce.number().min(0).max(50).nullable().default(null),
  retirementYear: z.coerce.number().int().min(2024).max(2100).nullable().default(null),
});

export const npsContributionSchema = z.object({
  // Not .uuid() — see transaction.schema.ts for why (demo-mode IDs aren't UUIDs).
  npsAccountId: z.string().min(1, "Missing account ID"),
  contributionDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  employeeAmount: z.coerce.number().nonnegative().default(0),
  employerAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type NPSAccountInput = z.infer<typeof npsAccountSchema>;

export const withdrawNPSSchema = z.object({
  amount: z.coerce.number().positive("Withdrawal amount must be greater than zero"),
});
export type NPSContributionInput = z.infer<typeof npsContributionSchema>;
