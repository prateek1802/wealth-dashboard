import { fixedDepositsRepository } from "@/lib/database/repositories/fixed-deposits.repository";
import { ppfRepository } from "@/lib/database/repositories/ppf.repository";
import { npsRepository } from "@/lib/database/repositories/nps.repository";
import { goalsRepository } from "@/lib/database/repositories/goals.repository";
import { calculateDaysUntil, calculatePPFMaturityDate } from "@/lib/calculations/maturity";
import { ROUTES } from "@/constants/routes";

export type ReminderKind = "fd" | "ppf" | "nps" | "goal";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  label: string;
  detail: string;
  date: string;
  daysRemaining: number;
  href: string;
}

const DEFAULT_THRESHOLD_DAYS = 30;

/**
 * Aggregates every "something is coming due" moment the app knows about
 * into one sorted list — FD maturity (explicit), PPF's real 15-year
 * maturity milestone (computed, not stored), NPS retirement year (if set),
 * and goal target dates. Only items within the threshold and not already
 * resolved (FD still active, goal not yet reached) are included. This
 * powers both the bell icon (every page) and can be reused wherever else
 * a reminder list is useful later.
 */
export const notificationsService = {
  async getUpcomingReminders(thresholdDays: number = DEFAULT_THRESHOLD_DAYS): Promise<Reminder[]> {
    const [fds, ppfAccounts, npsAccounts, goals] = await Promise.all([
      fixedDepositsRepository.findAll(),
      ppfRepository.findAll(),
      npsRepository.findAll(),
      goalsRepository.findAll(),
    ]);

    const reminders: Reminder[] = [];

    for (const fd of fds) {
      if (fd.status !== "active") continue;
      const daysRemaining = calculateDaysUntil(fd.maturityDate);
      if (daysRemaining <= thresholdDays) {
        reminders.push({
          id: `fd-${fd.id}`,
          kind: "fd",
          label: `${fd.institution} FD maturing`,
          detail: daysRemaining < 0 ? "Already matured — mark it as withdrawn" : `Matures ${fd.maturityDate}`,
          date: fd.maturityDate,
          daysRemaining,
          href: ROUTES.fixedDeposits,
        });
      }
    }

    for (const ppf of ppfAccounts) {
      const maturityDate = calculatePPFMaturityDate(ppf.openDate);
      const daysRemaining = calculateDaysUntil(maturityDate);
      if (daysRemaining <= thresholdDays) {
        reminders.push({
          id: `ppf-${ppf.id}`,
          kind: "ppf",
          label: `PPF${ppf.accountNumber ? ` · ${ppf.accountNumber}` : ""} reaches 15-year maturity`,
          detail: `Matures ${maturityDate} (can be extended in 5-year blocks)`,
          date: maturityDate,
          daysRemaining,
          href: ROUTES.ppf,
        });
      }
    }

    for (const nps of npsAccounts) {
      if (!nps.retirementYear) continue;
      const retirementDate = `${nps.retirementYear}-01-01`;
      const daysRemaining = calculateDaysUntil(retirementDate);
      if (daysRemaining <= thresholdDays) {
        reminders.push({
          id: `nps-${nps.id}`,
          kind: "nps",
          label: `${nps.tier} retirement year approaching`,
          detail: `Set for ${nps.retirementYear}`,
          date: retirementDate,
          daysRemaining,
          href: ROUTES.nps,
        });
      }
    }

    for (const goal of goals) {
      if (!goal.targetDate || goal.currentAmount >= goal.targetAmount) continue;
      const daysRemaining = calculateDaysUntil(goal.targetDate);
      if (daysRemaining <= thresholdDays) {
        reminders.push({
          id: `goal-${goal.id}`,
          kind: "goal",
          label: `"${goal.name}" target date approaching`,
          detail: `Target ${goal.targetDate}`,
          date: goal.targetDate,
          daysRemaining,
          href: ROUTES.goals,
        });
      }
    }

    return reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
  },
};
