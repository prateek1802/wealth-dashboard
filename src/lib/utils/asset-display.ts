import type { Asset } from "@/types/domain/asset";
import type { AssetType } from "@/constants/asset-types";

/** Both mutual fund variants (equity-oriented and debt) share the same NAV-based terminology and display conventions, unlike stocks/ETFs/crypto/bonds which are priced per-share. */
export function isMutualFundType(assetType: AssetType): boolean {
  return assetType === "mutual_fund" || assetType === "mutual_fund_debt";
}

/**
 * What to show as the PRIMARY label for an asset, vs. the secondary line.
 * For stocks/ETFs/crypto, the symbol (e.g. "TCS", "BTC") is short and
 * meaningful — show it big, name small below. For mutual funds, the
 * "symbol" is mfapi.in's numeric scheme code (e.g. "120716") — meaningless
 * to a human — so the readable scheme name should be primary instead, with
 * the code shown small as a secondary reference.
 */
export function getAssetDisplayLabel(asset: Pick<Asset, "assetType" | "symbol" | "name">): { primary: string; secondary: string } {
  if (isMutualFundType(asset.assetType)) {
    return { primary: asset.name, secondary: asset.symbol };
  }
  return { primary: asset.symbol, secondary: asset.name };
}

/**
 * Mutual funds are priced and held in NAV/units terminology, not
 * price/quantity — this is purely a labeling difference (the underlying
 * computed numbers — Holding.quantity, Holding.weightedAverageCost,
 * Asset.currentPrice — are identical fields used by every asset type; only
 * what to CALL them differs).
 */
export function quantityLabel(assetType: AssetType): string {
  return isMutualFundType(assetType) ? "Units" : "Qty";
}

export function avgPriceLabel(assetType: AssetType): string {
  return isMutualFundType(assetType) ? "Avg. NAV" : "Avg. Cost";
}

export function currentPriceLabel(assetType: AssetType): string {
  return isMutualFundType(assetType) ? "Present NAV" : "Current Price";
}
