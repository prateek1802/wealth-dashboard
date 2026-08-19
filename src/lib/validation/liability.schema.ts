import { z } from "zod";
import { LIABILITY_TYPES } from "@/constants/liabilities";

export const liabilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  liabilityType: z.enum(LIABILITY_TYPES),
  amountOwed: z.coerce.number().nonnegative(),
  interestRate: z.coerce.number().nonnegative().max(50).nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
});
