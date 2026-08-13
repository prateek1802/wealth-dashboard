"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput, PercentageInput, DateInput } from "@/components/shared/inputs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FDCard } from "@/components/shared/fd-card";
import { EmptyState } from "@/components/shared/empty-state";
import { addFixedDepositAction, deleteFixedDepositAction, withdrawFixedDepositAction } from "../actions";
import { FD_PAYOUT_TYPES } from "@/constants/asset-types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { todayISO } from "@/lib/utils/date";
import { PiggyBank, Plus, Trash2, Banknote } from "lucide-react";
import type { FDWithProjection } from "@/lib/services/fd.service";
import type { FDPayoutType } from "@/constants/asset-types";

export function FDView({ fds }: { fds: FDWithProjection[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<FDWithProjection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FDWithProjection | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [institution, setInstitution] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [payoutType, setPayoutType] = useState<FDPayoutType>("cumulative");
  const [withdrawalDate, setWithdrawalDate] = useState(todayISO());
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  const activeFds = fds.filter((f) => f.status === "active");
  const withdrawnFds = fds.filter((f) => f.status === "withdrawn");
  const totalPrincipal = activeFds.reduce((s, f) => s + f.principal, 0);
  const totalMaturity = activeFds.reduce((s, f) => s + f.projectedMaturityAmount, 0);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addFixedDepositAction({
        institution, principal: Number(principal), interestRate: Number(interestRate),
        startDate, maturityDate, tenureMonths: Number(tenureMonths), payoutType, notes: null,
      });
      if (result.ok) {
        toast.success("Fixed deposit added");
        setInstitution(""); setPrincipal(""); setInterestRate(""); setStartDate(""); setMaturityDate(""); setTenureMonths("");
        setDialogOpen(false);
      } else setError(result.error);
    });
  }

  function handleWithdraw() {
    if (!withdrawTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await withdrawFixedDepositAction(withdrawTarget.id, {
        withdrawalDate,
        withdrawalAmount: Number(withdrawalAmount),
      });
      if (result.ok) {
        toast.success("Marked as withdrawn — add the proceeds to a Bank Account if you're keeping the cash");
        setWithdrawTarget(null);
        setWithdrawalAmount("");
      } else setError(result.error);
    });
  }

  async function handleDelete(fd: FDWithProjection) {
    const result = await deleteFixedDepositAction(fd.id);
    if (result.ok) toast.success("Fixed deposit removed");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6 text-sm">
          <span className="text-ink-muted">Active principal <span className="font-tabular text-ink">{formatCurrency(totalPrincipal)}</span></span>
          <span className="text-ink-muted">Projected maturity <span className="font-tabular text-gain">{formatCurrency(totalMaturity)}</span></span>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add Fixed Deposit</Button>
      </div>

      {fds.length === 0 ? (
        <EmptyState icon={PiggyBank} title="No fixed deposits tracked" description="Add an FD to track its maturity timeline and expected interest." action={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add Fixed Deposit</Button>} />
      ) : (
        <>
          {activeFds.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeFds.map((fd) => (
                <div key={fd.id} className="relative">
                  <FDCard fd={fd} />
                  <div className="absolute right-4 top-4 flex gap-1">
                    <button onClick={() => { setWithdrawTarget(fd); setWithdrawalAmount(fd.projectedMaturityAmount.toString()); }} className="text-ink-muted hover:text-accent" title="Withdraw">
                      <Banknote className="size-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(fd)} className="text-ink-muted hover:text-loss" title="Delete">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {withdrawnFds.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-ink-muted">Withdrawn / Closed</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {withdrawnFds.map((fd) => (
                  <div key={fd.id} className="relative rounded-[var(--radius-card)] border border-border-subtle bg-surface-sunken p-5 opacity-80">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">{fd.institution}</span>
                        <span className="text-xs text-ink-muted">Withdrawn {fd.withdrawalDate ? formatDate(fd.withdrawalDate) : ""}</span>
                      </div>
                      <Badge>Closed</Badge>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xs text-ink-muted">Principal {formatCurrency(fd.principal)}</span>
                      <span className="font-tabular font-medium text-ink">{fd.withdrawalAmount ? formatCurrency(fd.withdrawalAmount) : "—"}</span>
                    </div>
                    <button onClick={() => setDeleteTarget(fd)} className="absolute right-4 top-4 text-ink-muted hover:text-loss">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add fixed deposit</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fd-institution">Institution</Label>
              <Input id="fd-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="HDFC Bank" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-principal">Principal</Label>
                <CurrencyInput id="fd-principal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-rate">Interest rate (% p.a.)</Label>
                <PercentageInput id="fd-rate" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-start">Start date</Label>
                <DateInput id="fd-start" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-maturity">Maturity date</Label>
                <DateInput id="fd-maturity" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-tenure">Tenure (months)</Label>
                <Input id="fd-tenure" type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-payout">Payout type</Label>
                <Select value={payoutType} onValueChange={(v) => setPayoutType(v as FDPayoutType)}>
                  <SelectTrigger id="fd-payout"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FD_PAYOUT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending || !institution || !principal || !interestRate || !startDate || !maturityDate || !tenureMonths}>
              {isPending ? "Saving…" : "Add fixed deposit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawTarget} onOpenChange={(o) => !o && setWithdrawTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw {withdrawTarget?.institution} FD</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-ink-muted">
              This marks the FD closed and moves it to your history — it stops counting toward your FD total.
              If you&apos;re keeping the money, add it to a Bank Account separately (this app doesn&apos;t move it automatically).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-withdraw-date">Withdrawal date</Label>
                <DateInput id="fd-withdraw-date" value={withdrawalDate} onChange={(e) => setWithdrawalDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fd-withdraw-amount">Amount received</Label>
                <CurrencyInput id="fd-withdraw-amount" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Defaulted to the projected maturity amount — lower this if withdrawing early (premature withdrawal usually earns less interest).
            </p>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleWithdraw} disabled={isPending || !withdrawalAmount || !withdrawalDate}>
              {isPending ? "Saving…" : "Confirm withdrawal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete fixed deposit?"
        description="This permanently removes it, including any withdrawal history. To just mark it closed, use Withdraw instead."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
