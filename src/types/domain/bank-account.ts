import type { BankAccountType } from "@/constants/bank-accounts";

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: BankAccountType;
  currentBalance: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewBankAccount = Omit<BankAccount, "id" | "createdAt" | "updatedAt">;
