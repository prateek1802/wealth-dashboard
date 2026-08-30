"use server";
import { revalidatePath } from "next/cache";
import { watchlistRepository } from "@/lib/database/repositories/watchlist.repository";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { watchlistItemSchema } from "@/lib/validation/watchlist.schema";
import { assetSchema } from "@/lib/validation/asset.schema";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import { z } from "zod";
import type { ActionResult } from "@/features/transactions/actions";

const addWatchlistSchema = z.object({
  asset: assetSchema,
  targetPrice: z.coerce.number().positive().optional().nullable(),
  stopLoss: z.coerce.number().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function addWatchlistItemAction(input: unknown): Promise<ActionResult> {
  const parsed = addWatchlistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const asset = await assetsRepository.upsertBySymbol({ ...parsed.data.asset, currentPrice: null, currentPriceUpdatedAt: null, isActive: true });
    const validated = watchlistItemSchema.parse({ assetId: asset.id, targetPrice: parsed.data.targetPrice, stopLoss: parsed.data.stopLoss, note: parsed.data.note });
    await watchlistRepository.add(validated);
    revalidatePath(ROUTES.watchlist);
    return { ok: true };
  } catch (err) {
    logServerError("addWatchlistItemAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function removeWatchlistItemAction(id: string): Promise<ActionResult> {
  try {
    await watchlistRepository.remove(id);
    revalidatePath(ROUTES.watchlist);
    return { ok: true };
  } catch (err) {
    logServerError("removeWatchlistItemAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
