import { z } from "zod";
import { FD_PAYOUT_TYPES } from "@/constants/asset-types";

export const fixedDepositSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(200),
  principal: z.coerce.number().positive("Principal must be greater than zero"),
  interestRate: z.coerce.number().positive("Interest rate must be greater than zero").max(50),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start date"),
  maturityDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid maturity date"),
  tenureMonths: z.coerce.number().int().positive("Tenure must be a positive number of months"),
  payoutType: z.enum(FD_PAYOUT_TYPES),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export const withdrawFixedDepositSchema = z.object({
  withdrawalDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  withdrawalAmount: z.coerce.number().positive("Withdrawal amount must be greater than zero"),
});

export type FixedDepositInput = z.infer<typeof fixedDepositSchema>;
