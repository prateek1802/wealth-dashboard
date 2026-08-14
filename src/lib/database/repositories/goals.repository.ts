import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoGoals, nextId } from "@/lib/database/demo-data";
import type { Goal, NewGoal } from "@/types/domain/goal";
import type { GoalRow } from "@/types/database";

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: row.target_date,
    category: row.category,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const goalsRepository = {
  async findAll(): Promise<Goal[]> {
    if (isDemoMode()) return [...demoGoals];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("goals").select("*").order("target_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as GoalRow[]).map(rowToGoal);
  },

  async create(input: NewGoal): Promise<Goal> {
    if (isDemoMode()) {
      const goal: Goal = { ...input, id: nextId("goal"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoGoals.push(goal);
      return goal;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("goals")
      .insert({
        name: input.name,
        target_amount: input.targetAmount,
        current_amount: input.currentAmount,
        target_date: input.targetDate,
        category: input.category,
        description: input.description,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToGoal(data as GoalRow);
  },

  async update(id: string, update: Partial<NewGoal>): Promise<Goal> {
    if (isDemoMode()) {
      const goal = demoGoals.find((g) => g.id === id);
      if (!goal) throw new Error("Goal not found");
      Object.assign(goal, update, { updatedAt: new Date().toISOString() });
      return goal;
    }
    const db = await getServerSupabaseClient();
    const row: Record<string, unknown> = {};
    if (update.name !== undefined) row.name = update.name;
    if (update.targetAmount !== undefined) row.target_amount = update.targetAmount;
    if (update.currentAmount !== undefined) row.current_amount = update.currentAmount;
    if (update.targetDate !== undefined) row.target_date = update.targetDate;
    if (update.category !== undefined) row.category = update.category;
    if (update.description !== undefined) row.description = update.description;
    const { data, error } = await db.from("goals").update(row).eq("id", id).select().single();
    if (error) throw error;
    return rowToGoal(data as GoalRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoGoals.findIndex((g) => g.id === id);
      if (idx >= 0) demoGoals.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("goals").delete().eq("id", id);
    if (error) throw error;
  },
};
