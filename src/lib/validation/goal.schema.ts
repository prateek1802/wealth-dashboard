import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  targetAmount: z.coerce.number().positive("Target amount must be greater than zero"),
  currentAmount: z.coerce.number().nonnegative().default(0),
  targetDate: z.string().optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export type GoalInput = z.infer<typeof goalSchema>;
