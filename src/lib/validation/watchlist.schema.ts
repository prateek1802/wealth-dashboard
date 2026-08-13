import { z } from "zod";

export const watchlistItemSchema = z.object({
  // Not .uuid() — see transaction.schema.ts for why (demo-mode IDs aren't UUIDs).
  assetId: z.string().min(1, "Missing asset ID"),
  targetPrice: z.coerce.number().positive().nullable().default(null),
  stopLoss: z.coerce.number().positive().nullable().default(null),
  note: z.string().trim().max(2000).nullable().default(null),
});

export type WatchlistItemInput = z.infer<typeof watchlistItemSchema>;
