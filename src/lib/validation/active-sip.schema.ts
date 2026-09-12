import { z } from "zod";

export const activeSipSchema = z.object({
  assetId: z.string().min(1, "Select a holding"),
  monthlyAmount: z.coerce.number().positive("Monthly amount must be greater than zero"),
});

export const activeSipAmountSchema = z.object({
  monthlyAmount: z.coerce.number().positive("Monthly amount must be greater than zero"),
});

export type ActiveSipInput = z.infer<typeof activeSipSchema>;
