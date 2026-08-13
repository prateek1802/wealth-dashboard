import { fixedDepositsRepository } from "@/lib/database/repositories/fixed-deposits.repository";
import { calculateFDMaturityAmount, calculateFDExpectedInterest, calculateFDDaysRemaining } from "@/lib/calculations/fd";
import type { FixedDeposit, NewFixedDeposit } from "@/types/domain/fixed-deposit";

export interface FDWithProjection extends FixedDeposit {
  projectedMaturityAmount: number;
  expectedInterest: number;
  daysRemaining: number;
}

export const fdService = {
  /** All FDs, active and withdrawn — the FD page renders them in separate sections. */
  async listWithProjections(): Promise<FDWithProjection[]> {
    const fds = await fixedDepositsRepository.findAll();
    return fds.map((fd) => ({
      ...fd,
      projectedMaturityAmount: fd.maturityAmount ?? calculateFDMaturityAmount(fd.principal, fd.interestRate, fd.tenureMonths, fd.payoutType),
      expectedInterest: calculateFDExpectedInterest(fd.principal, fd.interestRate, fd.tenureMonths, fd.payoutType),
      daysRemaining: calculateFDDaysRemaining(fd.maturityDate),
    }));
  },

  async totalValue(): Promise<number> {
    const fds = await fixedDepositsRepository.findAll();
    // Withdrawn FDs no longer count toward FD value — that money is no
    // longer parked in an FD (see the withdrawal dialog's note about
    // adding it to a Bank Account instead). Current value approximated as
    // principal for active FDs — full accrued-interest-to-date is a V2 refinement.
    return fds.filter((fd) => fd.status === "active").reduce((sum, fd) => sum + fd.principal, 0);
  },

  async create(input: NewFixedDeposit): Promise<FixedDeposit> {
    return fixedDepositsRepository.create(input);
  },

  /** Soft-close: marks withdrawn (premature or at maturity), keeps it visible as history. Never deletes. */
  async withdraw(id: string, withdrawalDate: string, withdrawalAmount: number): Promise<FixedDeposit> {
    return fixedDepositsRepository.withdraw(id, withdrawalDate, withdrawalAmount);
  },

  async remove(id: string): Promise<void> {
    return fixedDepositsRepository.delete(id);
  },
};
