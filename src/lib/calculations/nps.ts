import type { NPSProjectionPoint, NPSAccount, NPSContribution, NPSSchemeTransaction } from "@/types/domain/nps";
import type { Cashflow } from "./returns";
import type { NPSScheme } from "@/constants/nps";

/**
 * Dedup key for one scheme-level transaction, matching the DB's unique
 * index on (nps_account_id, scheme, transaction_date, description, units)
 * — see schema.sql. Single source of truth used by both the repository
 * (to build the set of already-persisted keys) and
 * selectTransactionsToImport() below (to check membership) — used to live
 * duplicated in both places, which is exactly the kind of drift risk that
 * makes idempotent import silently stop being idempotent.
 */
export function buildNPSTransactionDedupKey(scheme: NPSScheme, transactionDate: string, description: string | null, units: number): string {
  return `${scheme}|${transactionDate}|${description ?? ""}|${units.toFixed(4)}`;
}

/**
 * Year-by-year NPS corpus projection. Clearly an ESTIMATE — the UI is
 * responsible for labeling this as an assumption-driven projection, not a
 * guaranteed outcome (see FINANCIAL SAFETY requirements).
 */
export function projectNPSCorpus(params: {
  currentCorpus: number;
  monthlyContribution: number;
  annualContributionIncreasePercent: number;
  years: number;
  expectedAnnualReturnPercent: number;
}): NPSProjectionPoint[] {
  const { currentCorpus, monthlyContribution, annualContributionIncreasePercent, years, expectedAnnualReturnPercent } = params;

  const monthlyRate = expectedAnnualReturnPercent / 100 / 12;
  const points: NPSProjectionPoint[] = [];

  let corpus = currentCorpus;
  let currentMonthlyContribution = monthlyContribution;
  const currentYear = new Date().getFullYear();

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      corpus = corpus * (1 + monthlyRate) + currentMonthlyContribution;
    }
    currentMonthlyContribution *= 1 + annualContributionIncreasePercent / 100;
    points.push({ year: currentYear + year, corpus: Math.round(corpus) });
  }

  return points;
}

/**
 * Cash flows for the portfolio-wide XIRR: every logged contribution is an
 * outflow on its own date, plus one lump-sum terminal inflow (`today`) per
 * account for its current corpus.
 *
 * Contribution logging is a newer feature, so for each account there's
 * usually a gap between `currentCorpus` and the sum of its logged
 * contributions — money contributed before logging started, or before the
 * account existed in this app at all. That gap is modeled as a single
 * outflow on the account's `createdAt` date, so the XIRR isn't skewed by
 * treating untracked historical corpus as if it appeared for free. If a
 * withdrawal has pushed logged contributions above the current corpus,
 * there's nothing sensible to back out, so that account contributes no
 * synthetic entry for the gap (withdrawals aren't dated cash-flow events
 * here — npsRepository.withdraw() just reduces the corpus in place).
 */
export function buildNPSCashflows(accounts: NPSAccount[], contributions: NPSContribution[], today: string): Cashflow[] {
  const flows: Cashflow[] = [];

  for (const account of accounts) {
    const own = contributions.filter((c) => c.npsAccountId === account.id);
    const loggedTotal = own.reduce((sum, c) => sum + c.employeeAmount + c.employerAmount, 0);
    const untracked = account.currentCorpus - loggedTotal;
    if (untracked > 0) {
      flows.push({ date: account.createdAt.slice(0, 10), amount: -untracked });
    }
    for (const c of own) {
      flows.push({ date: c.contributionDate, amount: -(c.employeeAmount + c.employerAmount) });
    }
    if (account.currentCorpus > 0) {
      flows.push({ date: today, amount: account.currentCorpus });
    }
  }

  return flows;
}

/**
 * Cash flows for ONE account that has scheme-level data (i.e. a statement
 * has been imported for it — see Part 2/3/4 of the NPS rewrite), derived
 * from its real, dated nps_scheme_transactions rather than the
 * untracked-gap heuristic buildNPSCashflows() above uses.
 *
 * Only `contribution` and `withdrawal` rows are real cash flows.
 * `switch_in`/`switch_out` are internal reallocations between schemes — no
 * money enters or leaves the NPS account, so including them would double-
 * count the same rupees moving between schemes as if they were fresh
 * contributions. `fee` rows are excluded too: real but consistently
 * negligible (paisa-scale quarterly billing), not worth the complexity.
 *
 * Sign convention: schema stores amount as positive for
 * contribution/switch_in, negative for switch_out/fee/withdrawal — the
 * OPPOSITE of Cashflow's investor-perspective convention (negative =
 * outflow from the investor). So `-t.amount` is correct for BOTH kept
 * types: a positive contribution amount becomes a negative (outflow)
 * cash flow, and a negative withdrawal amount becomes a positive (inflow)
 * cash flow.
 *
 * KNOWN LIMITATION: if the imported statement doesn't cover the account's
 * entire history (e.g. only recent years), this will overstate XIRR the
 * same way the untracked-gap heuristic above exists to correct for — there
 * isn't an equivalent correction here, since once an account is on
 * scheme-level tracking there's no separate "opening balance" figure left
 * to reconcile against. Importing the full consolidated statement (not
 * just a recent period) avoids this.
 */
export function buildSchemeTransactionCashflows(effectiveCorpus: number, schemeTransactions: NPSSchemeTransaction[], today: string): Cashflow[] {
  const flows: Cashflow[] = schemeTransactions
    .filter((t) => t.transactionType === "contribution" || t.transactionType === "withdrawal")
    .map((t) => ({ date: t.transactionDate, amount: -t.amount }));

  if (effectiveCorpus > 0) {
    flows.push({ date: today, amount: effectiveCorpus });
  }

  return flows;
}
