import { z } from "zod";
import { TRANSACTION_TYPES } from "@/constants/asset-types";

export const transactionSchema = z.object({
  // Not .uuid(): in demo mode, IDs are strings like "asset-tcs" or
  // "asset-1042", not real UUIDs — only a connected Supabase project
  // produces those (via gen_random_uuid()). Any non-empty ID is valid here.
  assetId: z.string().min(1, "Missing asset ID"),
  transactionType: z.enum(TRANSACTION_TYPES),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  price: z.coerce.number().nonnegative("Price cannot be negative"),
  fees: z.coerce.number().nonnegative().default(0),
  taxes: z.coerce.number().nonnegative().default(0),
  transactionDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  broker: z.string().trim().max(100).nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
