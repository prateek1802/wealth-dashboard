import { describe, it, expect } from "vitest";
import { buildNPSCashflows, buildSchemeTransactionCashflows } from "@/lib/calculations/nps";
import { classifySchemeStatement } from "@/lib/calculations/nps-classification";
import type { NPSAccount, NPSContribution, NPSSchemeTransaction } from "@/types/domain/nps";
import type { RawStatementRow } from "@/lib/calculations/nps-classification";
import fixture from "./fixtures/nps-consolidated-sample.json";

function account(overrides: Partial<NPSAccount> = {}): NPSAccount {
  return {
    id: "nps-1",
    tier: "Tier I",
    pensionFundManager: null,
    schemePreference: null,
    pran: null,
    currentCorpus: 0,
    expectedAnnualReturn: null,
    monthlyContribution: null,
    annualContributionIncrease: null,
    retirementYear: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function contribution(overrides: Partial<NPSContribution> = {}): NPSContribution {
  return {
    id: "npsc-1",
    npsAccountId: "nps-1",
    contributionDate: "2024-06-01",
    employeeAmount: 0,
    employerAmount: 0,
    notes: null,
    createdAt: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildNPSCashflows", () => {
  it("treats the untracked gap between corpus and logged contributions as an outflow on account creation", () => {
    // Account opened with an existing 100k corpus (pre-dates logging), then
    // one logged contribution of 10k. Corpus today is 110k.
    const accounts = [account({ createdAt: "2023-01-01T00:00:00.000Z", currentCorpus: 110_000 })];
    const contributions = [contribution({ contributionDate: "2024-06-01", employeeAmount: 5000, employerAmount: 5000 })];

    const flows = buildNPSCashflows(accounts, contributions, "2025-01-01");

    expect(flows).toEqual([
      { date: "2023-01-01", amount: -100_000 }, // untracked opening corpus
      { date: "2024-06-01", amount: -10_000 }, // logged contribution
      { date: "2025-01-01", amount: 110_000 }, // terminal value
    ]);
  });

  it("omits the untracked-gap entry when logged contributions already cover the corpus", () => {
    // No pre-existing corpus — everything is logged (e.g. account created and
    // fully tracked from day one).
    const accounts = [account({ createdAt: "2024-01-01T00:00:00.000Z", currentCorpus: 20_000 })];
    const contributions = [contribution({ contributionDate: "2024-06-01", employeeAmount: 10_000, employerAmount: 10_000 })];

    const flows = buildNPSCashflows(accounts, contributions, "2025-01-01");

    expect(flows).toEqual([
      { date: "2024-06-01", amount: -20_000 },
      { date: "2025-01-01", amount: 20_000 },
    ]);
  });

  it("skips accounts with zero corpus and produces no terminal entry", () => {
    const accounts = [account({ currentCorpus: 0 })];
    const flows = buildNPSCashflows(accounts, [], "2025-01-01");
    expect(flows).toEqual([]);
  });

  it("keeps multiple accounts' cash flows independent", () => {
    const accounts = [
      account({ id: "nps-1", createdAt: "2023-01-01T00:00:00.000Z", currentCorpus: 50_000 }),
      account({ id: "nps-2", createdAt: "2023-06-01T00:00:00.000Z", currentCorpus: 30_000 }),
    ];
    const contributions = [contribution({ npsAccountId: "nps-1", contributionDate: "2024-01-01", employeeAmount: 5000, employerAmount: 5000 })];

    const flows = buildNPSCashflows(accounts, contributions, "2025-01-01");

    expect(flows).toEqual([
      { date: "2023-01-01", amount: -40_000 },
      { date: "2024-01-01", amount: -10_000 },
      { date: "2025-01-01", amount: 50_000 },
      { date: "2023-06-01", amount: -30_000 },
      { date: "2025-01-01", amount: 30_000 },
    ]);
  });
});

function schemeTxn(overrides: Partial<NPSSchemeTransaction> = {}): NPSSchemeTransaction {
  return {
    id: "npst-1",
    npsAccountId: "nps-1",
    scheme: "E",
    transactionDate: "2024-06-01",
    transactionType: "contribution",
    amount: 7000,
    nav: 40,
    units: 175,
    employeeAmount: null,
    employerAmount: null,
    linkedTransactionId: null,
    description: "By Contribution for May2024",
    createdAt: "2024-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSchemeTransactionCashflows", () => {
  it("treats a positive-stored contribution as a negative (outflow) cash flow", () => {
    const flows = buildSchemeTransactionCashflows(0, [schemeTxn({ amount: 7000, transactionDate: "2024-06-01" })], "2025-01-01");
    expect(flows).toEqual([{ date: "2024-06-01", amount: -7000 }]);
  });

  it("treats a negative-stored withdrawal as a positive (inflow) cash flow", () => {
    const flows = buildSchemeTransactionCashflows(0, [schemeTxn({ transactionType: "withdrawal", amount: -50_000, transactionDate: "2024-08-01" })], "2025-01-01");
    expect(flows).toEqual([{ date: "2024-08-01", amount: 50_000 }]);
  });

  it("excludes switch_in, switch_out, and fee rows entirely — no cash flow for any of them", () => {
    const flows = buildSchemeTransactionCashflows(
      0,
      [
        schemeTxn({ transactionType: "switch_in", amount: 5000, id: "1" }),
        schemeTxn({ transactionType: "switch_out", amount: -5000, id: "2" }),
        schemeTxn({ transactionType: "fee", amount: -2.18, id: "3" }),
      ],
      "2025-01-01"
    );
    expect(flows).toEqual([]);
  });

  it("appends one terminal inflow at `today` for the effective corpus, and omits it when corpus is zero", () => {
    const withCorpus = buildSchemeTransactionCashflows(100_000, [], "2025-01-01");
    expect(withCorpus).toEqual([{ date: "2025-01-01", amount: 100_000 }]);

    const zeroCorpus = buildSchemeTransactionCashflows(0, [], "2025-01-01");
    expect(zeroCorpus).toEqual([]);
  });

  it("reproduces the real subscriber's total invested amount as the sum of contribution outflows", () => {
    // Same real fixture validated elsewhere: classify all three schemes,
    // flatten to scheme transactions, run through the cashflow builder, and
    // confirm the contribution outflows still sum to the exact validated
    // total-invested figure — proving nothing was lost or double-counted
    // going from "classified transactions" to "XIRR cash flows".
    const allTxns: NPSSchemeTransaction[] = [];
    for (const scheme of ["E", "C", "G"] as const) {
      const { transactions } = classifySchemeStatement(fixture[scheme] as RawStatementRow[]);
      for (const t of transactions) {
        allTxns.push(
          schemeTxn({
            id: `${scheme}-${t.date}-${t.units}`,
            scheme,
            transactionDate: t.date,
            transactionType: t.transactionType,
            amount: t.amount,
            nav: t.nav,
            units: t.units,
            description: t.description,
          })
        );
      }
    }

    const flows = buildSchemeTransactionCashflows(882_252.12, allTxns, "2026-08-01");

    const contributionOutflowTotal = flows.filter((f) => f.date !== "2026-08-01").reduce((sum, f) => sum + -f.amount, 0);
    expect(contributionOutflowTotal).toBeCloseTo(770_430.0, 2);

    // No switch/fee dates leaked through as cash flows.
    const terminalEntries = flows.filter((f) => f.date === "2026-08-01");
    expect(terminalEntries).toHaveLength(1);
    expect(terminalEntries[0].amount).toBeCloseTo(882_252.12, 2);
  });
});
