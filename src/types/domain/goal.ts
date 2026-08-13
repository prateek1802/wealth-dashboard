export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  category: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewGoal = Omit<Goal, "id" | "createdAt" | "updatedAt">;
