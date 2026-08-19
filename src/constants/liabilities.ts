export const LIABILITY_TYPES = ["credit_card", "personal_loan", "home_loan", "vehicle_loan", "other"] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  credit_card: "Credit Card",
  personal_loan: "Personal Loan",
  home_loan: "Home Loan",
  vehicle_loan: "Vehicle Loan",
  other: "Other",
};
