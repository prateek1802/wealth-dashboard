import { z } from "zod";
import { ASSET_TYPES } from "@/constants/asset-types";

export const assetSchema = z.object({
  symbol: z.string().trim().min(1, "Symbol is required").max(32),
  name: z.string().trim().min(1, "Name is required").max(200),
  assetType: z.enum(ASSET_TYPES),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").default("INR"),
  exchange: z.string().trim().max(50).nullable().default(null),
  sector: z.string().trim().max(100).nullable().default(null),
  country: z.string().trim().max(100).nullable().default(null),
  isin: z.string().trim().max(20).nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export const assetPriceUpdateSchema = z.object({
  // Not .uuid() — see transaction.schema.ts for why (demo-mode IDs aren't UUIDs).
  assetId: z.string().min(1, "Missing asset ID"),
  currentPrice: z.coerce.number().positive("Price must be greater than zero"),
});

export type AssetInput = z.infer<typeof assetSchema>;
