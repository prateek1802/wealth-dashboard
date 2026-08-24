import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoNPSAccounts, demoNPSContributions, demoNPSSchemeHoldings, demoNPSSchemeTransactions, nextId } from "@/lib/database/demo-data";
import { buildNPSTransactionDedupKey } from "@/lib/calculations/nps";
import type { NPSAccount, NewNPSAccount, NPSContribution, NewNPSContribution, NPSSchemeHolding, NPSSchemeTransaction, NewNPSSchemeTransaction } from "@/types/domain/nps";
import type { NPSAccountRow, NPSContributionRow, NPSSchemeHoldingRow, NPSSchemeTransactionRow } from "@/types/database";
import type { NPSTier, NPSSchemePreference, NPSScheme } from "@/constants/nps";

function rowToAccount(row: NPSAccountRow): NPSAccount {
  return {
    id: row.id,
    tier: row.tier as NPSTier,
    pensionFundManager: row.pension_fund_manager,
    schemePreference: row.scheme_preference as NPSSchemePreference | null,
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

function rowToSchemeHolding(row: NPSSchemeHoldingRow): NPSSchemeHolding {
  return {
    id: row.id,
    npsAccountId: row.nps_account_id,
    scheme: row.scheme as NPSScheme,
    unitsHeld: row.units_held,
    lastNav: row.last_nav,
    lastNavDate: row.last_nav_date,
    npsnavSchemeCode: row.npsnav_scheme_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSchemeTransaction(row: NPSSchemeTransactionRow): NPSSchemeTransaction {
  return {
    id: row.id,
    npsAccountId: row.nps_account_id,
    scheme: row.scheme as NPSScheme,
    transactionDate: row.transaction_date,
    transactionType: row.transaction_type as NPSSchemeTransaction["transactionType"],
    amount: row.amount,
    nav: row.nav,
    units: row.units,
    employeeAmount: row.employee_amount,
    employerAmount: row.employer_amount,
    linkedTransactionId: row.linked_transaction_id,
    description: row.description,
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
        scheme_preference: input.schemePreference,
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
    if (update.schemePreference !== undefined) row.scheme_preference = update.schemePreference;
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

  /**
   * Every contribution across every NPS account the user holds (Tier I and
   * Tier II both), unfiltered by account. Used to build cash flows for the
   * portfolio-wide XIRR — Row Level Security already scopes this to the
   * current user same as any other query here.
   */
  async findAllContributions(): Promise<NPSContribution[]> {
    if (isDemoMode()) {
      return [...demoNPSContributions].sort((a, b) => a.contributionDate.localeCompare(b.contributionDate));
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("nps_contributions").select("*").order("contribution_date", { ascending: true });
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
    // BUGFIX: real mode used to only insert the contribution row and never
    // touch nps_accounts.current_corpus — logging a contribution silently
    // did nothing to the displayed corpus, net worth, or XIRR. Demo mode
    // already did this correctly; mirror it here, same read-then-write
    // pattern withdraw() already uses just above.
    const current = await db.from("nps_accounts").select("current_corpus").eq("id", input.npsAccountId).single();
    if (current.error) throw current.error;
    const { error: updateError } = await db
      .from("nps_accounts")
      .update({ current_corpus: current.data.current_corpus + input.employeeAmount + input.employerAmount })
      .eq("id", input.npsAccountId);
    if (updateError) throw updateError;
    return rowToContribution(data as NPSContributionRow);
  },

  // -------------------------------------------------------------------
  // Scheme-level (E/C/G/A) tracking — populated by statement import.
  // See lib/import/nps-statement-parser.ts and
  // lib/services/nps.service.ts#importStatement.
  // -------------------------------------------------------------------

  async findSchemeHoldings(npsAccountId: string): Promise<NPSSchemeHolding[]> {
    if (isDemoMode()) {
      return demoNPSSchemeHoldings.filter((h) => h.npsAccountId === npsAccountId);
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("nps_scheme_holdings").select("*").eq("nps_account_id", npsAccountId);
    if (error) throw error;
    return (data as NPSSchemeHoldingRow[]).map(rowToSchemeHolding);
  },

  /** All scheme holdings across every NPS account the user holds — used to derive total corpus for accounts that have scheme-level data. */
  async findAllSchemeHoldings(): Promise<NPSSchemeHolding[]> {
    if (isDemoMode()) return [...demoNPSSchemeHoldings];
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("nps_scheme_holdings").select("*");
    if (error) throw error;
    return (data as NPSSchemeHoldingRow[]).map(rowToSchemeHolding);
  },

  /** Upsert on (nps_account_id, scheme) — see the unique constraint in schema.sql. Only touches units_held/last_nav/last_nav_date — never npsnav_scheme_code, so the live-NAV mapping (set via setSchemeNAVSource) survives every re-import untouched. */
  async upsertSchemeHolding(npsAccountId: string, scheme: NPSScheme, unitsHeld: number, lastNav: number | null, lastNavDate: string | null): Promise<NPSSchemeHolding> {
    if (isDemoMode()) {
      const existing = demoNPSSchemeHoldings.find((h) => h.npsAccountId === npsAccountId && h.scheme === scheme);
      const now = new Date().toISOString();
      if (existing) {
        existing.unitsHeld = unitsHeld;
        existing.lastNav = lastNav;
        existing.lastNavDate = lastNavDate;
        existing.updatedAt = now;
        return existing;
      }
      const holding: NPSSchemeHolding = { id: nextId("npssh"), npsAccountId, scheme, unitsHeld, lastNav, lastNavDate, npsnavSchemeCode: null, createdAt: now, updatedAt: now };
      demoNPSSchemeHoldings.push(holding);
      return holding;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("nps_scheme_holdings")
      .upsert(
        { nps_account_id: npsAccountId, scheme, units_held: unitsHeld, last_nav: lastNav, last_nav_date: lastNavDate },
        { onConflict: "nps_account_id,scheme" }
      )
      .select()
      .single();
    if (error) throw error;
    return rowToSchemeHolding(data as NPSSchemeHoldingRow);
  },

  /** Records the user-confirmed npsnav.in scheme_code for live NAV refresh — see Part 5 of the NPS rewrite. The holding must already exist (created by an import); this never creates one. */
  async setSchemeNAVSource(npsAccountId: string, scheme: NPSScheme, schemeCode: string | null): Promise<void> {
    if (isDemoMode()) {
      const existing = demoNPSSchemeHoldings.find((h) => h.npsAccountId === npsAccountId && h.scheme === scheme);
      if (existing) {
        existing.npsnavSchemeCode = schemeCode;
        existing.updatedAt = new Date().toISOString();
      }
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("nps_scheme_holdings").update({ npsnav_scheme_code: schemeCode }).eq("nps_account_id", npsAccountId).eq("scheme", scheme);
    if (error) throw error;
  },

  /** Live-refreshes ONLY last_nav/last_nav_date — deliberately does not touch units_held, unlike upsertSchemeHolding(), since a live quote never changes how many units you hold. */
  async updateSchemeHoldingNAV(npsAccountId: string, scheme: NPSScheme, nav: number, navDate: string): Promise<void> {
    if (isDemoMode()) {
      const existing = demoNPSSchemeHoldings.find((h) => h.npsAccountId === npsAccountId && h.scheme === scheme);
      if (existing) {
        existing.lastNav = nav;
        existing.lastNavDate = navDate;
        existing.updatedAt = new Date().toISOString();
      }
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("nps_scheme_holdings").update({ last_nav: nav, last_nav_date: navDate }).eq("nps_account_id", npsAccountId).eq("scheme", scheme);
    if (error) throw error;
  },

  async findSchemeTransactions(npsAccountId: string): Promise<NPSSchemeTransaction[]> {
    if (isDemoMode()) {
      return demoNPSSchemeTransactions.filter((t) => t.npsAccountId === npsAccountId).sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("nps_scheme_transactions").select("*").eq("nps_account_id", npsAccountId).order("transaction_date", { ascending: true });
    if (error) throw error;
    return (data as NPSSchemeTransactionRow[]).map(rowToSchemeTransaction);
  },

  /** Dedup keys already persisted for this account — see buildNPSTransactionDedupKey() in calculations/nps.ts. Used by importStatement() to skip rows already imported (idempotent re-upload). */
  async findSchemeTransactionDedupKeys(npsAccountId: string): Promise<Set<string>> {
    const existing = await this.findSchemeTransactions(npsAccountId);
    return new Set(existing.map((t) => buildNPSTransactionDedupKey(t.scheme, t.transactionDate, t.description, t.units)));
  },

  async insertSchemeTransactions(rows: NewNPSSchemeTransaction[]): Promise<NPSSchemeTransaction[]> {
    if (rows.length === 0) return [];
    if (isDemoMode()) {
      const now = new Date().toISOString();
      const inserted = rows.map((r) => ({ ...r, id: nextId("npst"), createdAt: now }));
      demoNPSSchemeTransactions.push(...inserted);
      return inserted;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("nps_scheme_transactions")
      .insert(
        rows.map((r) => ({
          nps_account_id: r.npsAccountId,
          scheme: r.scheme,
          transaction_date: r.transactionDate,
          transaction_type: r.transactionType,
          amount: r.amount,
          nav: r.nav,
          units: r.units,
          employee_amount: r.employeeAmount,
          employer_amount: r.employerAmount,
          linked_transaction_id: r.linkedTransactionId,
          description: r.description,
        }))
      )
      .select();
    if (error) throw error;
    return (data as NPSSchemeTransactionRow[]).map(rowToSchemeTransaction);
  },

  async linkSchemeTransactions(idA: string, idB: string): Promise<void> {
    if (isDemoMode()) {
      const a = demoNPSSchemeTransactions.find((t) => t.id === idA);
      const b = demoNPSSchemeTransactions.find((t) => t.id === idB);
      if (a) a.linkedTransactionId = idB;
      if (b) b.linkedTransactionId = idA;
      return;
    }
    const db = await getServerSupabaseClient();
    const r1 = await db.from("nps_scheme_transactions").update({ linked_transaction_id: idB }).eq("id", idA);
    if (r1.error) throw r1.error;
    const r2 = await db.from("nps_scheme_transactions").update({ linked_transaction_id: idA }).eq("id", idB);
    if (r2.error) throw r2.error;
  },
};
