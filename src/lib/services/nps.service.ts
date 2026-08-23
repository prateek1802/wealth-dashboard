import { npsRepository } from "@/lib/database/repositories/nps.repository";
import { projectNPSCorpus, buildNPSCashflows, buildSchemeTransactionCashflows } from "@/lib/calculations/nps";
import { pairSwitches, selectTransactionsToImport } from "@/lib/import/nps-statement-parser";
import { todayISO } from "@/lib/utils/date";
import { NPS_SCHEMES, type NPSScheme } from "@/constants/nps";
import type { NPSProjectionPoint, NewNPSContribution, NewNPSAccount, NPSAccount, NPSSchemeTransaction } from "@/types/domain/nps";
import type { Cashflow } from "@/lib/calculations/returns";
import type { NPSStatementParseResult } from "@/lib/import/nps-statement-parser";

export interface NPSImportSummary {
  newRowsInserted: number;
  alreadyImported: number;
  unrecognizedRows: number;
  switchWarnings: NPSStatementParseResult["switchWarnings"];
  totalInvested: number;
}

export const npsService = {
  async listAccounts() {
    return npsRepository.findAll();
  },

  async getAccount(id: string) {
    return npsRepository.findById(id);
  },

  async createAccount(input: NewNPSAccount) {
    return npsRepository.create(input);
  },

  async updateAssumptions(id: string, update: Partial<NewNPSAccount>) {
    return npsRepository.updateAccount(id, update);
  },

  async removeAccount(id: string) {
    return npsRepository.delete(id);
  },

  async withdraw(id: string, amount: number) {
    return npsRepository.withdraw(id, amount);
  },

  async getContributions(accountId: string) {
    return npsRepository.findContributions(accountId);
  },

  async getProjection(accountId: string, yearsOverride?: number): Promise<NPSProjectionPoint[] | null> {
    const account = await npsRepository.findById(accountId);
    if (!account || !account.expectedAnnualReturn || !account.monthlyContribution) return null;
    const years = yearsOverride ?? Math.max(1, (account.retirementYear ?? new Date().getFullYear() + 20) - new Date().getFullYear());
    return projectNPSCorpus({
      currentCorpus: account.currentCorpus,
      monthlyContribution: account.monthlyContribution,
      annualContributionIncreasePercent: account.annualContributionIncrease ?? 0,
      years,
      expectedAnnualReturnPercent: account.expectedAnnualReturn,
    });
  },

  async addContribution(input: NewNPSContribution) {
    return npsRepository.addContribution(input);
  },

  /**
   * An account's corpus, preferring scheme-level data (units_held × last_nav
   * summed across E/C/G/A) when it exists — i.e. once a statement has been
   * imported for that account — and falling back to the manually-maintained
   * nps_accounts.current_corpus otherwise. See Part 2 of the NPS rewrite:
   * current_corpus is a fallback, not the source of truth, once scheme-level
   * tracking exists for an account.
   */
  async getEffectiveCorpus(account: NPSAccount): Promise<number> {
    const holdings = await npsRepository.findSchemeHoldings(account.id);
    if (holdings.length === 0) return account.currentCorpus;
    return holdings.reduce((sum, h) => sum + h.unitsHeld * (h.lastNav ?? 0), 0);
  },

  /** Total corpus across ALL NPS accounts (Tier I + Tier II combined) — what the aggregation service reports as npsValue. */
  async currentCorpus(): Promise<number> {
    const accounts = await npsRepository.findAll();
    const perAccount = await Promise.all(accounts.map((a) => this.getEffectiveCorpus(a)));
    return perAccount.reduce((sum, v) => sum + v, 0);
  },

  /**
   * Imports a parsed NPS statement (see lib/import/nps-statement-parser.ts)
   * into scheme-level tracking for one account. Idempotent: rows already
   * persisted (matched via the same dedup key as the DB's unique index) are
   * silently skipped rather than duplicated, so re-uploading the same or an
   * overlapping statement is always safe — this is what makes "just import
   * your full history every time you download an updated statement" work
   * without ever double-counting.
   *
   * After inserting new rows, this re-derives switch pairing and per-scheme
   * holdings from the FULL persisted set (existing + new) rather than just
   * this import's rows, so a switch whose two legs arrive in separate
   * imports (one already on file, one new) still gets linked correctly.
   */
  async importStatement(npsAccountId: string, parseResult: NPSStatementParseResult): Promise<NPSImportSummary> {
    const existingKeys = await npsRepository.findSchemeTransactionDedupKeys(npsAccountId);
    const { toInsert, alreadyImported, unrecognizedRows } = selectTransactionsToImport(parseResult, existingKeys);

    if (toInsert.length > 0) {
      await npsRepository.insertSchemeTransactions(
        toInsert.map((t) => ({
          npsAccountId,
          scheme: t.scheme,
          transactionDate: t.date,
          transactionType: t.transactionType,
          amount: t.amount,
          nav: t.nav,
          units: t.units,
          employeeAmount: null,
          employerAmount: null,
          linkedTransactionId: null,
          description: t.description,
        }))
      );
    }

    const allTxns = await npsRepository.findSchemeTransactions(npsAccountId);
    await relinkSwitchPairs(allTxns);
    await recomputeSchemeHoldings(npsAccountId, allTxns);

    return {
      newRowsInserted: toInsert.length,
      alreadyImported,
      unrecognizedRows,
      switchWarnings: parseResult.switchWarnings,
      totalInvested: parseResult.totalInvested,
    };
  },

  /** This account's persisted scheme-level transactions — used for a per-scheme breakdown in the UI. */
  async getSchemeTransactions(npsAccountId: string) {
    return npsRepository.findSchemeTransactions(npsAccountId);
  },

  async getSchemeHoldings(npsAccountId: string) {
    return npsRepository.findSchemeHoldings(npsAccountId);
  },

  /**
   * Cash flows for the portfolio-wide XIRR, routed per account:
   *  - Accounts with scheme-level data (a statement has been imported) use
   *    buildSchemeTransactionCashflows() — real, dated contribution/
   *    withdrawal rows, no untracked-gap guessing needed.
   *  - Accounts without it fall back to buildNPSCashflows()'s
   *    contribution-log + untracked-gap heuristic, unchanged from before.
   * A user with one imported account and one still-manual account gets a
   * correct blend of both — this is what fixes the Dashboard/Analytics XIRR
   * inconsistency (Part 6 of the NPS rewrite): both pages call this same
   * function now, so they can no longer disagree.
   */
  async getCashflows(): Promise<Cashflow[]> {
    const accounts = await npsRepository.findAll();
    const today = todayISO();
    const flows: Cashflow[] = [];
    const schemeTrackedIds = new Set<string>();

    const schemeTrackedFlows = await Promise.all(
      accounts.map(async (account) => {
        const holdings = await npsRepository.findSchemeHoldings(account.id);
        if (holdings.length === 0) return null;
        schemeTrackedIds.add(account.id);
        const [schemeTxns, effectiveCorpus] = await Promise.all([npsRepository.findSchemeTransactions(account.id), this.getEffectiveCorpus(account)]);
        return buildSchemeTransactionCashflows(effectiveCorpus, schemeTxns, today);
      })
    );
    for (const f of schemeTrackedFlows) {
      if (f) flows.push(...f);
    }

    const nonTrackedAccounts = accounts.filter((a) => !schemeTrackedIds.has(a.id));
    if (nonTrackedAccounts.length > 0) {
      const contributions = await npsRepository.findAllContributions();
      flows.push(...buildNPSCashflows(nonTrackedAccounts, contributions, today));
    }

    return flows;
  },
};

/**
 * Re-runs pairSwitches() (see lib/import/nps-statement-parser.ts) over ALL
 * of an account's persisted switch legs and links any newly-formed pair
 * that isn't linked in the DB yet. Re-deriving from the full persisted set
 * (rather than just the rows from the current import) is what makes a
 * switch whose two legs land in separate imports still get linked — the
 * pairing logic itself was validated against a real subscriber's switch
 * history in test/nps-statement-parser.test.ts.
 */
async function relinkSwitchPairs(allTxns: NPSSchemeTransaction[]): Promise<void> {
  const switchRowsByScheme: Partial<Record<NPSScheme, NPSSchemeTransaction[]>> = {};
  const pairingInput: Parameters<typeof pairSwitches>[0] = {};

  for (const scheme of NPS_SCHEMES) {
    const rows = allTxns.filter((t) => t.scheme === scheme && (t.transactionType === "switch_in" || t.transactionType === "switch_out"));
    if (rows.length === 0) continue;
    switchRowsByScheme[scheme] = rows;
    pairingInput[scheme] = rows.map((r) => ({
      kind: "transaction" as const,
      transactionType: r.transactionType as "switch_in" | "switch_out",
      date: r.transactionDate,
      amount: r.amount,
      nav: r.nav,
      units: r.units,
      description: r.description ?? "",
    }));
  }

  const { paired } = pairSwitches(pairingInput);

  const byGroup = new Map<string, NPSSchemeTransaction[]>();
  for (const scheme of NPS_SCHEMES) {
    const dbRows = switchRowsByScheme[scheme];
    const pairedRows = paired[scheme];
    if (!dbRows || !pairedRows) continue;
    dbRows.forEach((dbRow, i) => {
      const groupId = pairedRows[i]?.switchGroupId;
      if (!groupId) return;
      const arr = byGroup.get(groupId) ?? [];
      arr.push(dbRow);
      byGroup.set(groupId, arr);
    });
  }

  for (const rows of byGroup.values()) {
    if (rows.length !== 2) continue; // only link clean 1:1 pairs
    const [a, b] = rows;
    if (a.linkedTransactionId === b.id && b.linkedTransactionId === a.id) continue; // already linked
    await npsRepository.linkSchemeTransactions(a.id, b.id);
  }
}

/**
 * Rebuilds nps_scheme_holdings for every scheme that has any persisted
 * transactions, purely from the currently-persisted transaction set. This
 * is what makes holdings correct regardless of whether an import added 0,
 * some, or all of its rows as new — always derived fresh, never
 * incrementally patched.
 */
async function recomputeSchemeHoldings(npsAccountId: string, allTxns: NPSSchemeTransaction[]): Promise<void> {
  for (const scheme of NPS_SCHEMES) {
    const schemeTxns = allTxns.filter((t) => t.scheme === scheme);
    if (schemeTxns.length === 0) continue;
    const unitsHeld = schemeTxns.reduce((sum, t) => sum + t.units, 0);
    const latest = schemeTxns.reduce((a, b) => (a.transactionDate > b.transactionDate ? a : b));
    await npsRepository.upsertSchemeHolding(npsAccountId, scheme, unitsHeld, latest.nav, latest.transactionDate);
  }
}
