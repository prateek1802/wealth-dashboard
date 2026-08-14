import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoBankAccounts, nextId } from "@/lib/database/demo-data";
import type { BankAccount, NewBankAccount } from "@/types/domain/bank-account";
import type { BankAccountRow } from "@/types/database";
import type { BankAccountType } from "@/constants/bank-accounts";

function rowToBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountType: row.account_type as BankAccountType,
    currentBalance: row.current_balance,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const bankAccountsRepository = {
  async findAll(): Promise<BankAccount[]> {
    if (isDemoMode()) return [...demoBankAccounts];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("bank_accounts").select("*").order("bank_name");
    if (error) throw error;
    return (data as BankAccountRow[]).map(rowToBankAccount);
  },

  async create(input: NewBankAccount): Promise<BankAccount> {
    if (isDemoMode()) {
      const account: BankAccount = { ...input, id: nextId("bank"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoBankAccounts.push(account);
      return account;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("bank_accounts")
      .insert({ bank_name: input.bankName, account_type: input.accountType, current_balance: input.currentBalance, notes: input.notes })
      .select()
      .single();
    if (error) throw error;
    return rowToBankAccount(data as BankAccountRow);
  },

  async updateBalance(id: string, currentBalance: number): Promise<BankAccount> {
    if (isDemoMode()) {
      const account = demoBankAccounts.find((a) => a.id === id);
      if (!account) throw new Error("Bank account not found");
      account.currentBalance = currentBalance;
      account.updatedAt = new Date().toISOString();
      return account;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("bank_accounts").update({ current_balance: currentBalance }).eq("id", id).select().single();
    if (error) throw error;
    return rowToBankAccount(data as BankAccountRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoBankAccounts.findIndex((a) => a.id === id);
      if (idx >= 0) demoBankAccounts.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("bank_accounts").delete().eq("id", id);
    if (error) throw error;
  },
};
