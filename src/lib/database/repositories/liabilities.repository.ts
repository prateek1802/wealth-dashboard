import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoLiabilities, nextId } from "@/lib/database/demo-data";
import type { Liability, NewLiability } from "@/types/domain/liability";
import type { LiabilityRow } from "@/types/database";
import type { LiabilityType } from "@/constants/liabilities";

function rowToLiability(row: LiabilityRow): Liability {
  return {
    id: row.id,
    name: row.name,
    liabilityType: row.liability_type as LiabilityType,
    amountOwed: row.amount_owed,
    interestRate: row.interest_rate,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const liabilitiesRepository = {
  async findAll(): Promise<Liability[]> {
    if (isDemoMode()) return [...demoLiabilities];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("liabilities").select("*").order("name");
    if (error) throw error;
    return (data as LiabilityRow[]).map(rowToLiability);
  },

  async create(input: NewLiability): Promise<Liability> {
    if (isDemoMode()) {
      const liability: Liability = { ...input, id: nextId("liability"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoLiabilities.push(liability);
      return liability;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("liabilities")
      .insert({ name: input.name, liability_type: input.liabilityType, amount_owed: input.amountOwed, interest_rate: input.interestRate, notes: input.notes })
      .select()
      .single();
    if (error) throw error;
    return rowToLiability(data as LiabilityRow);
  },

  async update(id: string, input: NewLiability): Promise<Liability> {
    if (isDemoMode()) {
      const liability = demoLiabilities.find((l) => l.id === id);
      if (!liability) throw new Error("Liability not found");
      Object.assign(liability, input, { updatedAt: new Date().toISOString() });
      return liability;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("liabilities")
      .update({ name: input.name, liability_type: input.liabilityType, amount_owed: input.amountOwed, interest_rate: input.interestRate, notes: input.notes })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToLiability(data as LiabilityRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoLiabilities.findIndex((l) => l.id === id);
      if (idx >= 0) demoLiabilities.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("liabilities").delete().eq("id", id);
    if (error) throw error;
  },
};
