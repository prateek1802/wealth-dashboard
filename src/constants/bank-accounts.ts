export const BANK_ACCOUNT_TYPES = ["savings", "current", "salary", "nre_nro", "other"] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  savings: "Savings",
  current: "Current",
  salary: "Salary",
  nre_nro: "NRE/NRO",
  other: "Other",
};
