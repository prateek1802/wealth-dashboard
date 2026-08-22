import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { goalsRepository } from "@/lib/database/repositories/goals.repository";
import { fixedDepositsRepository } from "@/lib/database/repositories/fixed-deposits.repository";
import { npsRepository } from "@/lib/database/repositories/nps.repository";
import { ppfRepository } from "@/lib/database/repositories/ppf.repository";
import { bankAccountsRepository } from "@/lib/database/repositories/bank-accounts.repository";
import { liabilitiesRepository } from "@/lib/database/repositories/liabilities.repository";
import { watchlistRepository } from "@/lib/database/repositories/watchlist.repository";
import type { Asset } from "@/types/domain/asset";
import type { Transaction } from "@/types/domain/transaction";
import type { Goal } from "@/types/domain/goal";
import type { FixedDeposit } from "@/types/domain/fixed-deposit";
import type { NPSAccount, NPSContribution } from "@/types/domain/nps";
import type { PPFAccount } from "@/types/domain/ppf";
import type { BankAccount } from "@/types/domain/bank-account";
import type { Liability } from "@/types/domain/liability";
import type { WatchlistItem } from "@/types/domain/watchlist";

export const BACKUP_FORMAT_VERSION = 1;

export interface WealthBackup {
  formatVersion: number;
  exportedAt: string;
  assets: Asset[];
  transactions: Transaction[];
  goals: Goal[];
  fixedDeposits: FixedDeposit[];
  npsAccounts: NPSAccount[];
  npsContributions: NPSContribution[];
  ppfAccounts: PPFAccount[];
  bankAccounts: BankAccount[];
  liabilities: Liability[];
  watchlistItems: WatchlistItem[];
}

export interface BackupImportSummary {
  assets: number;
  transactions: number;
  goals: number;
  fixedDeposits: number;
  npsAccounts: number;
  npsContributions: number;
  ppfAccounts: number;
  bankAccounts: number;
  liabilities: number;
  watchlistItems: number;
  errors: string[];
}

/**
 * Full data backup — everything the app tracks, as one JSON file. This is
 * the answer to demo mode's biggest limitation: without a connected
 * Supabase project, all data lives in memory and resets whenever the dev
 * server restarts. Export before you stop `npm run dev`, re-import after
 * you start it again, and none of your manual entry is lost. Once you
 * connect a real Supabase project (see SETUP.md), this becomes a genuine
 * portable backup instead of a survival mechanism.
 *
 * Import is ADDITIVE — it never deletes or overwrites existing records.
 * Re-importing the same backup twice will duplicate everything. Importing
 * into a fresh/empty instance (the normal case, right after a restart) is
 * the intended use.
 */
export const backupService = {
  async exportAll(): Promise<WealthBackup> {
    const npsAccounts = await npsRepository.findAll();
    const npsContributions = (await Promise.all(npsAccounts.map((a) => npsRepository.findContributions(a.id)))).flat();

    const [assets, transactions, goals, fixedDeposits, ppfAccounts, bankAccounts, liabilities, watchlistItems] = await Promise.all([
      assetsRepository.findAll(),
      transactionsRepository.findAll(),
      goalsRepository.findAll(),
      fixedDepositsRepository.findAll(),
      ppfRepository.findAll(),
      bankAccountsRepository.findAll(),
      liabilitiesRepository.findAll(),
      watchlistRepository.findAll(),
    ]);

    return {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      assets,
      transactions,
      goals,
      fixedDeposits,
      npsAccounts,
      npsContributions,
      ppfAccounts,
      bankAccounts,
      liabilities,
      watchlistItems,
    };
  },

  async importAll(backup: WealthBackup): Promise<BackupImportSummary> {
    const summary: BackupImportSummary = {
      assets: 0, transactions: 0, goals: 0, fixedDeposits: 0,
      npsAccounts: 0, npsContributions: 0, ppfAccounts: 0, bankAccounts: 0, liabilities: 0, watchlistItems: 0,
      errors: [],
    };

    if (backup.formatVersion !== BACKUP_FORMAT_VERSION) {
      summary.errors.push(`Unrecognized backup format version ${backup.formatVersion} — attempting import anyway.`);
    }

    // Assets first (transactions/watchlist reference them by ID) — re-create
    // under find-or-create-by-symbol so re-importing over an instance that
    // already has some of these assets reuses the existing asset row rather
    // than erroring, while still being additive for transactions themselves.
    const assetIdMap = new Map<string, string>(); // old id -> resolved id
    for (const asset of backup.assets ?? []) {
      try {
        const resolved = await assetsRepository.upsertBySymbol({
          symbol: asset.symbol, name: asset.name, assetType: asset.assetType, currency: asset.currency,
          exchange: asset.exchange, sector: asset.sector, country: asset.country, isin: asset.isin,
          currentPrice: asset.currentPrice, currentPriceUpdatedAt: asset.currentPriceUpdatedAt,
          isActive: asset.isActive, notes: asset.notes,
        });
        assetIdMap.set(asset.id, resolved.id);
        summary.assets += 1;
      } catch (err) {
        summary.errors.push(`Asset ${asset.symbol}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    const sortedTransactions = [...(backup.transactions ?? [])].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    for (const txn of sortedTransactions) {
      const assetId = assetIdMap.get(txn.assetId);
      if (!assetId) { summary.errors.push(`Transaction ${txn.id}: referenced asset not found in backup`); continue; }
      try {
        await transactionsRepository.create({
          assetId, transactionType: txn.transactionType, quantity: txn.quantity, price: txn.price,
          fees: txn.fees, taxes: txn.taxes, transactionDate: txn.transactionDate, broker: txn.broker, notes: txn.notes,
        });
        summary.transactions += 1;
      } catch (err) {
        summary.errors.push(`Transaction on ${txn.transactionDate}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    for (const goal of backup.goals ?? []) {
      try {
        await goalsRepository.create({ name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, targetDate: goal.targetDate, category: goal.category, description: goal.description });
        summary.goals += 1;
      } catch (err) {
        summary.errors.push(`Goal ${goal.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    for (const fd of backup.fixedDeposits ?? []) {
      try {
        const created = await fixedDepositsRepository.create({
          institution: fd.institution, principal: fd.principal, interestRate: fd.interestRate, startDate: fd.startDate,
          maturityDate: fd.maturityDate, tenureMonths: fd.tenureMonths, payoutType: fd.payoutType,
          maturityAmount: fd.maturityAmount, notes: fd.notes,
        });
        // create() always starts a FD as active — re-apply withdrawn status
        // so a backup taken after a withdrawal doesn't silently un-withdraw it.
        if (fd.status === "withdrawn" && fd.withdrawalDate && fd.withdrawalAmount !== null) {
          await fixedDepositsRepository.withdraw(created.id, fd.withdrawalDate, fd.withdrawalAmount);
        }
        summary.fixedDeposits += 1;
      } catch (err) {
        summary.errors.push(`Fixed deposit ${fd.institution}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    const npsIdMap = new Map<string, string>();
    for (const account of backup.npsAccounts ?? []) {
      try {
        const created = await npsRepository.create({
          tier: account.tier, pensionFundManager: account.pensionFundManager, schemePreference: account.schemePreference, pran: account.pran,
          currentCorpus: account.currentCorpus, expectedAnnualReturn: account.expectedAnnualReturn,
          monthlyContribution: account.monthlyContribution, annualContributionIncrease: account.annualContributionIncrease,
          retirementYear: account.retirementYear,
        });
        npsIdMap.set(account.id, created.id);
        summary.npsAccounts += 1;
      } catch (err) {
        summary.errors.push(`NPS account ${account.tier}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    for (const contribution of backup.npsContributions ?? []) {
      const npsAccountId = npsIdMap.get(contribution.npsAccountId);
      if (!npsAccountId) { summary.errors.push(`NPS contribution ${contribution.id}: referenced account not found in backup`); continue; }
      try {
        await npsRepository.addContribution({
          npsAccountId, contributionDate: contribution.contributionDate,
          employeeAmount: contribution.employeeAmount, employerAmount: contribution.employerAmount, notes: contribution.notes,
        });
        summary.npsContributions += 1;
      } catch (err) {
        summary.errors.push(`NPS contribution on ${contribution.contributionDate}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    for (const ppf of backup.ppfAccounts ?? []) {
      try {
        const created = await ppfRepository.create({
          accountNumber: ppf.accountNumber, currentBalance: ppf.currentBalance, totalContributed: ppf.totalContributed,
          interestRate: ppf.interestRate, openDate: ppf.openDate, yearlyContribution: ppf.yearlyContribution, notes: ppf.notes,
        });
        // create() always starts totalWithdrawn at 0 — re-apply any prior
        // withdrawal so backed-up withdrawal history survives a restore.
        // Note: withdraw() also decrements currentBalance, so we deliberately
        // start create() from the CURRENT balance (post-withdrawal) and the
        // withdraw() call below double-counts on purpose to restore totalWithdrawn
        // without under-crediting currentBalance — see the compensating top-up.
        if (ppf.totalWithdrawn > 0) {
          await ppfRepository.updateBalance(created.id, ppf.currentBalance + ppf.totalWithdrawn, ppf.totalContributed);
          await ppfRepository.withdraw(created.id, ppf.totalWithdrawn);
        }
        summary.ppfAccounts += 1;
      } catch (err) {
        summary.errors.push(`PPF account: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    for (const bank of backup.bankAccounts ?? []) {
      try {
        await bankAccountsRepository.create({ bankName: bank.bankName, accountType: bank.accountType, currentBalance: bank.currentBalance, notes: bank.notes });
        summary.bankAccounts += 1;
      } catch (err) {
        summary.errors.push(`Bank account ${bank.bankName}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    for (const liability of backup.liabilities ?? []) {
      try {
        await liabilitiesRepository.create({ name: liability.name, liabilityType: liability.liabilityType, amountOwed: liability.amountOwed, interestRate: liability.interestRate, notes: liability.notes });
        summary.liabilities += 1;
      } catch (err) {
        summary.errors.push(`Liability ${liability.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    for (const item of backup.watchlistItems ?? []) {
      const assetId = assetIdMap.get(item.assetId);
      if (!assetId) { summary.errors.push(`Watchlist item: referenced asset not found in backup`); continue; }
      try {
        await watchlistRepository.add({ assetId, targetPrice: item.targetPrice, stopLoss: item.stopLoss, note: item.note });
        summary.watchlistItems += 1;
      } catch (err) {
        summary.errors.push(`Watchlist item: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    return summary;
  },
};
