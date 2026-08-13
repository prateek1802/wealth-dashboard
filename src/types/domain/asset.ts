import type { AssetType } from "@/constants/asset-types";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: string;
  exchange: string | null;
  sector: string | null;
  country: string | null;
  isin: string | null;
  currentPrice: number | null;
  currentPriceUpdatedAt: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewAsset = Omit<Asset, "id" | "createdAt" | "updatedAt">;
export type AssetUpdate = Partial<Omit<Asset, "id" | "createdAt" | "updatedAt">>;
