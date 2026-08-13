"use server";
import { revalidatePath } from "next/cache";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { assetSchema, assetPriceUpdateSchema } from "@/lib/validation/asset.schema";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/features/transactions/actions";

/**
 * "Edit Asset" is a distinct concept from recording a transaction (point 8):
 * this only ever touches metadata / current price / notes, never quantity
 * or cost basis, which are always derived from transactions.
 */
export async function updateAssetMetadataAction(assetId: string, input: unknown): Promise<ActionResult> {
  const parsed = assetSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await assetsRepository.update(assetId, parsed.data);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.investmentDetail(assetId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function updateAssetPriceAction(input: unknown): Promise<ActionResult> {
  const parsed = assetPriceUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await assetsRepository.updatePrice(parsed.data.assetId, parsed.data.currentPrice);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.investmentDetail(parsed.data.assetId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteAssetAction(assetId: string): Promise<ActionResult> {
  try {
    await assetsRepository.softDelete(assetId);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export interface RefreshPricesResult {
  ok: true;
  updated: number;
  skipped: string[]; // symbols with no live source (e.g. mutual funds, "other")
}

/**
 * Fetches a live quote for every active security via the free CoinGecko
 * (crypto) / Yahoo Finance (equities) sources in lib/market-data/live-provider.ts,
 * and writes whatever it successfully got back via the same updatePrice()
 * path Edit Asset uses. Best-effort per asset — one failed quote never
 * blocks the others. Cash, FD, NPS, and PPF have no market quote by design.
 */
export async function refreshLivePricesAction(): Promise<RefreshPricesResult | { ok: false; error: string }> {
  try {
    const { getLiveQuoteForAsset } = await import("@/lib/market-data/live-provider");
    const assets = await assetsRepository.findAll();
    let updated = 0;
    const skipped: string[] = [];

    for (const asset of assets) {
      const quote = await getLiveQuoteForAsset(asset);
      if (quote) {
        await assetsRepository.updatePrice(asset.id, quote.price);
        updated += 1;
      } else {
        skipped.push(asset.symbol);
      }
    }

    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.portfolio);
    return { ok: true, updated, skipped };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
