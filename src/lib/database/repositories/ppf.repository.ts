import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoPPFAccounts, nextId } from "@/lib/database/demo-data";
import type { PPFAccount, NewPPFAccount } from "@/types/domain/ppf";
import type { PPFAccountRow } from "@/types/database";

function rowToPPF(row: PPFAccountRow): PPFAccount {
  return {
    id: row.id,
    accountNumber: row.account_number,
    currentBalance: row.current_balance,
    totalContributed: row.total_contributed,
    totalWithdrawn: row.total_withdrawn,
    interestRate: row.interest_rate,
    openDate: row.open_date,
    yearlyContribution: row.yearly_contribution,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ppfRepository = {
  async findAll(): Promise<PPFAccount[]> {
    if (isDemoMode()) return [...demoPPFAccounts];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("ppf_accounts").select("*").order("open_date");
    if (error) throw error;
    return (data as PPFAccountRow[]).map(rowToPPF);
  },

  async create(input: NewPPFAccount): Promise<PPFAccount> {
    if (isDemoMode()) {
      const account: PPFAccount = { ...input, totalWithdrawn: 0, id: nextId("ppf"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoPPFAccounts.push(account);
      return account;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("ppf_accounts")
      .insert({
        account_number: input.accountNumber,
        current_balance: input.currentBalance,
        total_contributed: input.totalContributed,
        interest_rate: input.interestRate,
        open_date: input.openDate,
        yearly_contribution: input.yearlyContribution,
        notes: input.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToPPF(data as PPFAccountRow);
  },

  async updateBalance(id: string, currentBalance: number, totalContributed: number): Promise<PPFAccount> {
    if (isDemoMode()) {
      const account = demoPPFAccounts.find((p) => p.id === id);
      if (!account) throw new Error("PPF account not found");
      account.currentBalance = currentBalance;
      account.totalContributed = totalContributed;
      account.updatedAt = new Date().toISOString();
      return account;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("ppf_accounts")
      .update({ current_balance: currentBalance, total_contributed: totalContributed })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToPPF(data as PPFAccountRow);
  },

  /** Partial withdrawal — reduces currentBalance, increases the running totalWithdrawn so all-time interest stays correct. */
  async withdraw(id: string, amount: number): Promise<PPFAccount> {
    if (isDemoMode()) {
      const account = demoPPFAccounts.find((p) => p.id === id);
      if (!account) throw new Error("PPF account not found");
      if (amount > account.currentBalance) throw new Error("Cannot withdraw more than the current balance");
      account.currentBalance -= amount;
      account.totalWithdrawn += amount;
      account.updatedAt = new Date().toISOString();
      return account;
    }
    const db = await getServerSupabaseClient();
    const current = await db.from("ppf_accounts").select("current_balance, total_withdrawn").eq("id", id).single();
    if (current.error) throw current.error;
    if (amount > current.data.current_balance) throw new Error("Cannot withdraw more than the current balance");
    const { data, error } = await db
      .from("ppf_accounts")
      .update({
        current_balance: current.data.current_balance - amount,
        total_withdrawn: current.data.total_withdrawn + amount,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToPPF(data as PPFAccountRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoPPFAccounts.findIndex((p) => p.id === id);
      if (idx >= 0) demoPPFAccounts.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("ppf_accounts").delete().eq("id", id);
    if (error) throw error;
  },
};
