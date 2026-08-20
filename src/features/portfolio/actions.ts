"use server";
import { revalidatePath } from "next/cache";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { portfolioService } from "@/lib/services/portfolio.service";
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
    const { priceHistoryService } = await import("@/lib/services/price-history.service");
    await priceHistoryService.record(parsed.data.assetId, parsed.data.currentPrice);
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
 * Fetches a live quote for every CURRENTLY HELD security (quantity > 0) via
 * the free CoinGecko (crypto) / Yahoo Finance (equities) / mfapi.in (Indian
 * MF) sources in lib/market-data/live-provider.ts, and writes whatever it
 * successfully got back via the same updatePrice() path Edit Asset uses.
 * Best-effort per asset — one failed quote never blocks the others. Cash,
 * FD, NPS, and PPF have no market quote by design.
 *
 * Scoped to `portfolioService.getHoldings()` (quantity > 0), NOT
 * `assetsRepository.findAll()` — a fully-sold-out (zero-holding) asset is
 * kept around for its realized P&L history but has nothing live to refresh,
 * so refreshing it every time was pure wasted API calls.
 *
 * @param assetIds Optional subset to refresh — e.g. just one asset-class
 * group's holdings (Stocks, Mutual Funds, ...) from the portfolio page, so
 * the user isn't stuck re-fetching everything to update one section.
 * Omit to refresh all current holdings.
 */
export async function refreshLivePricesAction(assetIds?: string[]): Promise<RefreshPricesResult | { ok: false; error: string }> {
  try {
    const { getLiveQuoteForAsset } = await import("@/lib/market-data/live-provider");
    const { priceHistoryService } = await import("@/lib/services/price-history.service");
    const holdings = await portfolioService.getHoldings();
    const idFilter = assetIds ? new Set(assetIds) : null;
    const targets = idFilter ? holdings.filter((h) => idFilter.has(h.asset.id)) : holdings;

    let updated = 0;
    const skipped: string[] = [];

    for (const { asset } of targets) {
      const quote = await getLiveQuoteForAsset(asset);
      if (quote) {
        await assetsRepository.updatePrice(asset.id, quote.price);
        await priceHistoryService.record(asset.id, quote.price);
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
