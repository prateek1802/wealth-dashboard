import type { NPSTier, NPSSchemePreference, NPSScheme } from "@/constants/nps";

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

/**
 * One scheme's (E/C/G/A) unit holding within an NPS account. currentCorpus on
 * NPSAccount is derived from sum(unitsHeld * lastNav) across these when they
 * exist for an account — see buildDerivedCorpus() in calculations/nps.ts.
 */
export interface NPSSchemeHolding {
  id: string;
  npsAccountId: string;
  scheme: NPSScheme;
  unitsHeld: number;
  lastNav: number | null;
  lastNavDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewNPSSchemeHolding = Omit<NPSSchemeHolding, "id" | "createdAt" | "updatedAt">;

export type NPSSchemeTransactionType = "contribution" | "switch_in" | "switch_out" | "fee" | "withdrawal";

/**
 * One row of a real NPS statement (NSDL/Protean), post-classification. See
 * classifyStatementRow() in calculations/nps-classification.ts for how a raw
 * statement line becomes one of these (or gets skipped entirely).
 */
export interface NPSSchemeTransaction {
  id: string;
  npsAccountId: string;
  scheme: NPSScheme;
  transactionDate: string;
  transactionType: NPSSchemeTransactionType;
  amount: number; // signed: + contribution/switch_in, - switch_out/fee/withdrawal
  nav: number;
  units: number; // signed, same convention as amount
  employeeAmount: number | null; // only meaningful for 'contribution'; often unknown per-scheme (see classifier)
  employerAmount: number | null;
  linkedTransactionId: string | null; // pairs a switch_out with its switch_in
  description: string | null; // raw statement text, kept for reference/debugging
  createdAt: string;
}

export type NewNPSSchemeTransaction = Omit<NPSSchemeTransaction, "id" | "createdAt">;
