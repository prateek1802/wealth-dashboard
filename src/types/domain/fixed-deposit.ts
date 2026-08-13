import type { FDPayoutType } from "@/constants/asset-types";

export interface FixedDeposit {
  id: string;
  institution: string;
  principal: number;
  interestRate: number; // annual %, e.g. 7.25
  startDate: string;
  maturityDate: string;
  tenureMonths: number;
  payoutType: FDPayoutType;
  maturityAmount: number | null;
  status: "active" | "withdrawn";
  withdrawalDate: string | null;
  withdrawalAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewFixedDeposit = Omit<FixedDeposit, "id" | "createdAt" | "updatedAt" | "status" | "withdrawalDate" | "withdrawalAmount">;
