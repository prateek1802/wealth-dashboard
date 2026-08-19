import type { LiabilityType } from "@/constants/liabilities";

export interface Liability {
  id: string;
  name: string;
  liabilityType: LiabilityType;
  amountOwed: number;
  interestRate: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewLiability = Omit<Liability, "id" | "createdAt" | "updatedAt">;
