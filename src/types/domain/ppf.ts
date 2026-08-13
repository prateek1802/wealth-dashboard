export interface PPFAccount {
  id: string;
  accountNumber: string | null;
  currentBalance: number;
  totalContributed: number; // principal — the sum of your own deposits
  totalWithdrawn: number; // sum of partial withdrawals taken out over the account's life
  interestRate: number; // annual %, government-set, revised quarterly — enter the current rate
  openDate: string;
  yearlyContribution: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewPPFAccount = Omit<PPFAccount, "id" | "createdAt" | "updatedAt" | "totalWithdrawn">;
