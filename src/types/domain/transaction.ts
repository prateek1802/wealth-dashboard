import type { TransactionType } from "@/constants/asset-types";

export interface Transaction {
  id: string;
  assetId: string;
  transactionType: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  taxes: number;
  transactionDate: string; // ISO date (yyyy-MM-dd)
  broker: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

/** A FIFO-matched lot consumed by one or more SELLs, produced by lots.ts */
export interface Lot {
  quantity: number;
  costBasisPerUnit: number;
  acquiredDate: string;
}
