import { npsRepository } from "@/lib/database/repositories/nps.repository";
import { projectNPSCorpus, buildNPSCashflows } from "@/lib/calculations/nps";
import { todayISO } from "@/lib/utils/date";
import type { NPSProjectionPoint, NewNPSContribution, NewNPSAccount } from "@/types/domain/nps";
import type { Cashflow } from "@/lib/calculations/returns";

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

  /** Total corpus across ALL NPS accounts (Tier I + Tier II combined) — what the aggregation service reports as npsValue. */
  async currentCorpus(): Promise<number> {
    const accounts = await npsRepository.findAll();
    return accounts.reduce((sum, a) => sum + a.currentCorpus, 0);
  },

  /**
   * Cash flows for the portfolio-wide XIRR — see buildNPSCashflows() in
   * calculations/nps.ts for the modeling details (untracked pre-logging
   * corpus, terminal value, etc.).
   */
  async getCashflows(): Promise<Cashflow[]> {
    const [accounts, contributions] = await Promise.all([npsRepository.findAll(), npsRepository.findAllContributions()]);
    return buildNPSCashflows(accounts, contributions, todayISO());
  },
};
