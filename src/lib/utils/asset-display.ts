import type { Asset } from "@/types/domain/asset";

/**
 * What to show as the PRIMARY label for an asset, vs. the secondary line.
 * For stocks/ETFs/crypto, the symbol (e.g. "TCS", "BTC") is short and
 * meaningful — show it big, name small below. For mutual funds, the
 * "symbol" is mfapi.in's numeric scheme code (e.g. "120716") — meaningless
 * to a human — so the readable scheme name should be primary instead, with
 * the code shown small as a secondary reference.
 */
export function getAssetDisplayLabel(asset: Pick<Asset, "assetType" | "symbol" | "name">): { primary: string; secondary: string } {
  if (asset.assetType === "mutual_fund" || asset.assetType === "mutual_fund_debt") {
    return { primary: asset.name, secondary: asset.symbol };
  }
  return { primary: asset.symbol, secondary: asset.name };
}
