import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoNPSAccounts, demoNPSContributions, nextId } from "@/lib/database/demo-data";
import type { NPSAccount, NewNPSAccount, NPSContribution, NewNPSContribution } from "@/types/domain/nps";
import type { NPSAccountRow, NPSContributionRow } from "@/types/database";
import type { NPSTier } from "@/constants/nps";

function rowToAccount(row: NPSAccountRow): NPSAccount {
  return {
    id: row.id,
    tier: row.tier as NPSTier,
    pensionFundManager: row.pension_fund_manager,
    pran: row.pran,
    currentCorpus: row.current_corpus,
    expectedAnnualReturn: row.expected_annual_return,
    monthlyContribution: row.monthly_contribution,
    annualContributionIncrease: row.annual_contribution_increase,
    retirementYear: row.retirement_year,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToContribution(row: NPSContributionRow): NPSContribution {
  return {
    id: row.id,
    npsAccountId: row.nps_account_id,
    contributionDate: row.contribution_date,
    employeeAmount: row.employee_amount,
    employerAmount: row.employer_amount,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export const npsRepository = {
  /** V1 supports multiple accounts — typically one per Tier (Tier I / Tier II). */
  async findAll(): Promise<NPSAccount[]> {
    if (isDemoMode()) return [...demoNPSAccounts];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("nps_accounts").select("*").order("tier");
    if (error) throw error;
    return (data as NPSAccountRow[]).map(rowToAccount);
  },

  async findById(id: string): Promise<NPSAccount | null> {
    const accounts = await this.findAll();
    return accounts.find((a) => a.id === id) ?? null;
  },

  async create(input: NewNPSAccount): Promise<NPSAccount> {
    if (isDemoMode()) {
      const account: NPSAccount = { ...input, id: nextId("nps"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoNPSAccounts.push(account);
      return account;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("nps_accounts")
      .insert({
        tier: input.tier,
        pension_fund_manager: input.pensionFundManager,
        pran: input.pran,
        current_corpus: input.currentCorpus,
        expected_annual_return: input.expectedAnnualReturn,
        monthly_contribution: input.monthlyContribution,
        annual_contribution_increase: input.annualContributionIncrease,
        retirement_year: input.retirementYear,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToAccount(data as NPSAccountRow);
  },

  async updateAccount(id: string, update: Partial<NewNPSAccount>): Promise<NPSAccount> {
    if (isDemoMode()) {
      const account = demoNPSAccounts.find((a) => a.id === id);
      if (!account) throw new Error("NPS account not found");
      Object.assign(account, update, { updatedAt: new Date().toISOString() });
      return account;
    }
    const db = await getServerSupabaseClient();
    const row: Record<string, unknown> = {};
    if (update.tier !== undefined) row.tier = update.tier;
    if (update.pensionFundManager !== undefined) row.pension_fund_manager = update.pensionFundManager;
    if (update.pran !== undefined) row.pran = update.pran;
    if (update.currentCorpus !== undefined) row.current_corpus = update.currentCorpus;
    if (update.expectedAnnualReturn !== undefined) row.expected_annual_return = update.expectedAnnualReturn;
    if (update.monthlyContribution !== undefined) row.monthly_contribution = update.monthlyContribution;
    if (update.annualContributionIncrease !== undefined) row.annual_contribution_increase = update.annualContributionIncrease;
    if (update.retirementYear !== undefined) row.retirement_year = update.retirementYear;
    const { data, error } = await db.from("nps_accounts").update(row).eq("id", id).select().single();
    if (error) throw error;
    return rowToAccount(data as NPSAccountRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoNPSAccounts.findIndex((a) => a.id === id);
      if (idx >= 0) demoNPSAccounts.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("nps_accounts").delete().eq("id", id);
    if (error) throw error;
  },

  /** Partial withdrawal — reduces currentCorpus. Real NPS rules restrict when/how much you can withdraw (Tier I is locked until retirement except limited partial exits; Tier II is liquid) — this app doesn't enforce those, it just records what you tell it. */
  async withdraw(id: string, amount: number): Promise<NPSAccount> {
    if (isDemoMode()) {
      const account = demoNPSAccounts.find((a) => a.id === id);
      if (!account) throw new Error("NPS account not found");
      if (amount > account.currentCorpus) throw new Error("Cannot withdraw more than the current corpus");
      account.currentCorpus -= amount;
      account.updatedAt = new Date().toISOString();
      return account;
    }
    const db = await getServerSupabaseClient();
    const current = await db.from("nps_accounts").select("current_corpus").eq("id", id).single();
    if (current.error) throw current.error;
    if (amount > current.data.current_corpus) throw new Error("Cannot withdraw more than the current corpus");
    const { data, error } = await db
      .from("nps_accounts")
      .update({ current_corpus: current.data.current_corpus - amount })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToAccount(data as NPSAccountRow);
  },

  async findContributions(npsAccountId: string): Promise<NPSContribution[]> {
    if (isDemoMode()) {
      return demoNPSContributions
        .filter((c) => c.npsAccountId === npsAccountId)
        .sort((a, b) => b.contributionDate.localeCompare(a.contributionDate));
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("nps_contributions")
      .select("*")
      .eq("nps_account_id", npsAccountId)
      .order("contribution_date", { ascending: false });
    if (error) throw error;
    return (data as NPSContributionRow[]).map(rowToContribution);
  },

  async addContribution(input: NewNPSContribution): Promise<NPSContribution> {
    if (isDemoMode()) {
      const contribution: NPSContribution = { ...input, id: nextId("npsc"), createdAt: new Date().toISOString() };
      demoNPSContributions.push(contribution);
      const account = demoNPSAccounts.find((a) => a.id === input.npsAccountId);
      if (account) account.currentCorpus += input.employeeAmount + input.employerAmount;
      return contribution;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("nps_contributions")
      .insert({
        nps_account_id: input.npsAccountId,
        contribution_date: input.contributionDate,
        employee_amount: input.employeeAmount,
        employer_amount: input.employerAmount,
        notes: input.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToContribution(data as NPSContributionRow);
  },
};
