import { describe, it, expect } from "vitest";
import { buildNPSCashflows } from "@/lib/calculations/nps";
import type { NPSAccount, NPSContribution } from "@/types/domain/nps";

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
