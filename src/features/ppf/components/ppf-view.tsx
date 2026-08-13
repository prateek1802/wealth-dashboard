"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput, PercentageInput, DateInput } from "@/components/shared/inputs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { addPPFAccountAction, updatePPFBalanceAction, deletePPFAccountAction, withdrawPPFAction } from "../actions";
import { calculatePPFInterestEarned } from "@/lib/calculations/ppf";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { Landmark, Plus, Trash2, Pencil, Banknote } from "lucide-react";
import type { PPFAccount } from "@/types/domain/ppf";

export function PPFView({ accounts }: { accounts: PPFAccount[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PPFAccount | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<PPFAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PPFAccount | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [accountNumber, setAccountNumber] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [totalContributed, setTotalContributed] = useState("");
  const [interestRate, setInterestRate] = useState("7.1");
  const [openDate, setOpenDate] = useState("");
  const [yearlyContribution, setYearlyContribution] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editContributed, setEditContributed] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const totalPrincipal = accounts.reduce((s, a) => s + a.totalContributed, 0);
  const totalInterest = totalBalance - totalPrincipal;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addPPFAccountAction({
        accountNumber: accountNumber || null,
        currentBalance: Number(currentBalance),
        totalContributed: Number(totalContributed || currentBalance), // sensible default: assume no interest yet if left blank
        interestRate: Number(interestRate),
        openDate,
        yearlyContribution: yearlyContribution ? Number(yearlyContribution) : null,
        notes: null,
      });
      if (result.ok) {
        toast.success("PPF account added");
        setAccountNumber(""); setCurrentBalance(""); setTotalContributed(""); setOpenDate(""); setYearlyContribution("");
        setDialogOpen(false);
      } else setError(result.error);
    });
  }

  function handleUpdateBalance() {
    if (!editTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await updatePPFBalanceAction(editTarget.id, Number(editBalance), Number(editContributed));
      if (result.ok) {
        toast.success("Balance updated");
        setEditTarget(null);
      } else setError(result.error);
    });
  }

  async function handleDelete(account: PPFAccount) {
    const result = await deletePPFAccountAction(account.id);
    if (result.ok) toast.success("PPF account removed");
    else toast.error(result.error);
  }

  function handleWithdraw() {
    if (!withdrawTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await withdrawPPFAction(withdrawTarget.id, { amount: Number(withdrawAmount) });
      if (result.ok) {
        toast.success("Withdrawal recorded");
        setWithdrawTarget(null);
        setWithdrawAmount("");
      } else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6 text-sm">
          <span className="text-ink-muted">Principal <span className="font-tabular text-ink">{formatCurrency(totalPrincipal)}</span></span>
          <span className="text-ink-muted">Interest earned <span className="font-tabular text-gain">{formatCurrency(totalInterest)}</span></span>
          <span className="text-ink-muted">Balance <span className="font-tabular text-ink">{formatCurrency(totalBalance)}</span></span>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add PPF Account</Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon={Landmark} title="No PPF accounts tracked" description="Add your PPF account to include it in your net worth and portfolio breakdown." action={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add PPF Account</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const interestEarned = calculatePPFInterestEarned(a.currentBalance, a.totalContributed, a.totalWithdrawn);
            return (
              <Card key={a.id} className="relative flex flex-col gap-3 p-5">
                <div className="flex flex-col">
                  <span className="font-medium text-ink">{a.accountNumber ? `PPF · ${a.accountNumber}` : "PPF Account"}</span>
                  <span className="text-xs text-ink-muted">Opened {formatDate(a.openDate)} · {a.interestRate}% p.a.</span>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-ink-muted">
                    <span>Principal (contributions)</span>
                    <span className="font-tabular text-ink">{formatCurrency(a.totalContributed)}</span>
                  </div>
                  {a.totalWithdrawn > 0 && (
                    <div className="flex justify-between text-ink-muted">
                      <span>Withdrawn to date</span>
                      <span className="font-tabular text-ink">{formatCurrency(a.totalWithdrawn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-ink-muted">
                    <span>Interest earned (all-time)</span>
                    <span className="font-tabular text-gain">{formatCurrency(interestEarned)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border-subtle pt-1 font-medium text-ink">
                    <span>Current balance</span>
                    <span className="font-tabular">{formatCurrency(a.currentBalance)}</span>
                  </div>
                </div>
                {a.yearlyContribution && (
                  <span className="text-xs text-ink-muted">Yearly contribution {formatCurrency(a.yearlyContribution)}</span>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditTarget(a); setEditBalance(a.currentBalance.toString()); setEditContributed(a.totalContributed.toString()); }}
                  >
                    <Pencil className="size-3.5" /> Update
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setWithdrawTarget(a)} disabled={a.currentBalance <= 0}>
                    <Banknote className="size-3.5" /> Withdraw
                  </Button>
                </div>
                <button onClick={() => setDeleteTarget(a)} className="absolute right-4 top-4 text-ink-muted hover:text-loss">
                  <Trash2 className="size-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add PPF account</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ppf-acc">Account number (optional)</Label>
              <Input id="ppf-acc" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppf-contributed">Total contributions (principal)</Label>
                <CurrencyInput id="ppf-contributed" value={totalContributed} onChange={(e) => setTotalContributed(e.target.value)} placeholder="Sum of your own deposits so far" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppf-balance">Current balance (passbook)</Label>
                <CurrencyInput id="ppf-balance" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Interest earned is shown as the difference between balance and contributions — leave contributions blank to assume no interest yet.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppf-rate">Interest rate (% p.a.)</Label>
                <PercentageInput id="ppf-rate" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppf-open">Open date</Label>
                <DateInput id="ppf-open" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ppf-yearly">Yearly contribution</Label>
              <CurrencyInput id="ppf-yearly" value={yearlyContribution} onChange={(e) => setYearlyContribution(e.target.value)} />
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending || !currentBalance || !interestRate || !openDate}>
              {isPending ? "Saving…" : "Add PPF account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update PPF account</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-ink-muted">
              PPF interest is credited annually and rates change by government notification —
              update these whenever your passbook reflects new figures.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppf-edit-contributed">Total contributions (principal)</Label>
                <CurrencyInput id="ppf-edit-contributed" value={editContributed} onChange={(e) => setEditContributed(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ppf-edit-balance">Current balance</Label>
                <CurrencyInput id="ppf-edit-balance" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleUpdateBalance} disabled={isPending || !editBalance || !editContributed}>
              {isPending ? "Saving…" : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawTarget} onOpenChange={(o) => !o && setWithdrawTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw from PPF</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-ink-muted">
              Records a partial withdrawal — reduces your current balance. PPF rules only allow partial
              withdrawals after 7 years, and this app doesn&apos;t enforce that; enter whatever your passbook shows.
              {withdrawTarget && (
                <> Maximum: {formatCurrency(withdrawTarget.currentBalance)}.</>
              )}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ppf-withdraw-amount">Amount</Label>
              <CurrencyInput id="ppf-withdraw-amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} max={withdrawTarget?.currentBalance} />
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleWithdraw} disabled={isPending || !withdrawAmount}>
              {isPending ? "Saving…" : "Confirm withdrawal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete PPF account?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
