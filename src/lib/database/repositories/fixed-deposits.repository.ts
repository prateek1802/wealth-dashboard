import { getServerSupabaseClient, isDemoMode } from "@/lib/database/client";
import { demoFixedDeposits, nextId } from "@/lib/database/demo-data";
import type { FixedDeposit, NewFixedDeposit } from "@/types/domain/fixed-deposit";
import type { FixedDepositRow } from "@/types/database";
import type { FDPayoutType } from "@/constants/asset-types";

function rowToFD(row: FixedDepositRow): FixedDeposit {
  return {
    id: row.id,
    institution: row.institution,
    principal: row.principal,
    interestRate: row.interest_rate,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    tenureMonths: row.tenure_months,
    payoutType: row.payout_type as FDPayoutType,
    maturityAmount: row.maturity_amount,
    status: row.status as "active" | "withdrawn",
    withdrawalDate: row.withdrawal_date,
    withdrawalAmount: row.withdrawal_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const fixedDepositsRepository = {
  async findAll(): Promise<FixedDeposit[]> {
    if (isDemoMode()) return [...demoFixedDeposits].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
    const db = getServerSupabaseClient();
    const { data, error } = await db.from("fixed_deposits").select("*").order("maturity_date");
    if (error) throw error;
    return (data as FixedDepositRow[]).map(rowToFD);
  },

  async create(input: NewFixedDeposit): Promise<FixedDeposit> {
    if (isDemoMode()) {
      const fd: FixedDeposit = {
        ...input,
        id: nextId("fd"),
        status: "active",
        withdrawalDate: null,
        withdrawalAmount: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      demoFixedDeposits.push(fd);
      return fd;
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db
      .from("fixed_deposits")
      .insert({
        institution: input.institution,
        principal: input.principal,
        interest_rate: input.interestRate,
        start_date: input.startDate,
        maturity_date: input.maturityDate,
        tenure_months: input.tenureMonths,
        payout_type: input.payoutType,
        maturity_amount: input.maturityAmount,
        notes: input.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToFD(data as FixedDepositRow);
  },

  /** Marks the FD withdrawn (premature or at maturity) — soft-close, never deleted, so it stays visible as history. */
  async withdraw(id: string, withdrawalDate: string, withdrawalAmount: number): Promise<FixedDeposit> {
    if (isDemoMode()) {
      const fd = demoFixedDeposits.find((f) => f.id === id);
      if (!fd) throw new Error("Fixed deposit not found");
      fd.status = "withdrawn";
      fd.withdrawalDate = withdrawalDate;
      fd.withdrawalAmount = withdrawalAmount;
      fd.updatedAt = new Date().toISOString();
      return fd;
    }
    const db = getServerSupabaseClient();
    const { data, error } = await db
      .from("fixed_deposits")
      .update({ status: "withdrawn", withdrawal_date: withdrawalDate, withdrawal_amount: withdrawalAmount })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToFD(data as FixedDepositRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoFixedDeposits.findIndex((f) => f.id === id);
      if (idx >= 0) demoFixedDeposits.splice(idx, 1);
      return;
    }
    const db = getServerSupabaseClient();
    const { error } = await db.from("fixed_deposits").delete().eq("id", id);
    if (error) throw error;
  },
};
