import type { NPSTier, NPSSchemePreference } from "@/constants/nps";

export interface NPSAccount {
  id: string;
  tier: NPSTier;
  pensionFundManager: string | null;
  schemePreference: NPSSchemePreference | null;
  pran: string | null;
  currentCorpus: number;
  expectedAnnualReturn: number | null;
  monthlyContribution: number | null;
  annualContributionIncrease: number | null;
  retirementYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export type NewNPSAccount = Omit<NPSAccount, "id" | "createdAt" | "updatedAt">;

export interface NPSContribution {
  id: string;
  npsAccountId: string;
  contributionDate: string;
  employeeAmount: number;
  employerAmount: number;
  notes: string | null;
  createdAt: string;
}

export type NewNPSContribution = Omit<NPSContribution, "id" | "createdAt">;

export interface NPSProjectionPoint {
  year: number;
  corpus: number;
}
