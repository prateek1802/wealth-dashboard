"use client";
import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput, PercentageInput } from "@/components/shared/inputs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { NPSProjectionChart } from "./nps-projection-chart";
import { addNPSAccountAction, updateNPSAssumptionsAction, deleteNPSAccountAction, addNPSContributionAction, withdrawNPSAction } from "../actions";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { NPS_TIERS } from "@/constants/nps";
import { ShieldCheck, Settings, Plus, Trash2, Banknote } from "lucide-react";
import type { NPSAccount, NPSContribution, NPSProjectionPoint } from "@/types/domain/nps";
import type { NPSTier } from "@/constants/nps";

interface NPSViewProps {
  accounts: NPSAccount[];
  contributionsByAccount: Record<string, NPSContribution[]>;
  projectionsByAccount: Record<string, NPSProjectionPoint[] | null>;
}

export function NPSView({ accounts, contributionsByAccount, projectionsByAccount }: NPSViewProps) {
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [assumptionsTarget, setAssumptionsTarget] = useState<NPSAccount | null>(null);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NPSAccount | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<NPSAccount | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [tier, setTier] = useState<NPSTier>("Tier I");
  const [pfm, setPfm] = useState("");
  const [currentCorpus, setCurrentCorpus] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("10");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [annualIncrease, setAnnualIncrease] = useState("0");
  const [retirementYear, setRetirementYear] = useState("");
  const [contributionAccountId, setContributionAccountId] = useState<string>("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionDate, setContributionDate] = useState("");

  const totalCorpus = accounts.reduce((s, a) => s + a.currentCorpus, 0);
  const selectedAccount = useMemo(() => accounts.find((a) => a.id === selectedAccountId) ?? null, [accounts, selectedAccountId]);

  function handleAddAccount() {
    setError(null);
    startTransition(async () => {
      const result = await addNPSAccountAction({
        tier,
        pensionFundManager: pfm || null,
        pran: null,
        currentCorpus: Number(currentCorpus || 0),
        expectedAnnualReturn: Number(expectedReturn),
        monthlyContribution: Number(monthlyContribution || 0),
        annualContributionIncrease: Number(annualIncrease || 0),
        retirementYear: retirementYear ? Number(retirementYear) : null,
      });
      if (result.ok) {
        toast.success("NPS account added");
        setPfm(""); setCurrentCorpus(""); setMonthlyContribution(""); setRetirementYear("");
        setAddAccountOpen(false);
      } else setError(result.error);
    });
  }

  function handleUpdateAssumptions() {
    if (!assumptionsTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await updateNPSAssumptionsAction(assumptionsTarget.id, {
        tier: assumptionsTarget.tier,
        pensionFundManager: assumptionsTarget.pensionFundManager,
        pran: assumptionsTarget.pran,
        currentCorpus: assumptionsTarget.currentCorpus,
        expectedAnnualReturn: Number(expectedReturn),
        monthlyContribution: Number(monthlyContribution),
        annualContributionIncrease: Number(annualIncrease),
        retirementYear: retirementYear ? Number(retirementYear) : null,
      });
      if (result.ok) {
        toast.success("Assumptions updated");
        setAssumptionsTarget(null);
      } else setError(result.error);
    });
  }

  function handleAddContribution() {
    setError(null);
    startTransition(async () => {
      const result = await addNPSContributionAction({
        npsAccountId: contributionAccountId,
        contributionDate,
        employeeAmount: Number(contributionAmount || 0),
        employerAmount: 0,
        notes: null,
      });
      if (result.ok) {
        toast.success("Contribution logged");
        setContributionAmount(""); setContributionDate("");
        setContributionOpen(false);
      } else setError(result.error);
    });
  }

  async function handleDelete(account: NPSAccount) {
    const result = await deleteNPSAccountAction(account.id);
    if (result.ok) toast.success("NPS account removed");
    else toast.error(result.error);
  }

  function handleWithdraw() {
    if (!withdrawTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await withdrawNPSAction(withdrawTarget.id, { amount: Number(withdrawAmount) });
      if (result.ok) {
        toast.success("Withdrawal recorded");
        setWithdrawTarget(null);
        setWithdrawAmount("");
      } else setError(result.error);
    });
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={ShieldCheck}
          title="No NPS accounts tracked"
          description="Add your Tier I or Tier II NPS account, along with your pension fund manager, to track corpus and projections."
          action={<Button onClick={() => setAddAccountOpen(true)}><Plus className="size-4" /> Add NPS Account</Button>}
        />
        {renderAddDialog()}
      </div>
    );
  }

  function renderAddDialog() {
    return (
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add NPS account</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nps-tier">Tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as NPSTier)}>
                  <SelectTrigger id="nps-tier"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NPS_TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nps-pfm">Pension fund manager</Label>
                <Input id="nps-pfm" value={pfm} onChange={(e) => setPfm(e.target.value)} placeholder="HDFC Pension Fund" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nps-corpus">Current corpus</Label>
              <CurrencyInput id="nps-corpus" value={currentCorpus} onChange={(e) => setCurrentCorpus(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nps-return">Expected return (% p.a.)</Label>
                <PercentageInput id="nps-return" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nps-monthly">Monthly contribution</Label>
                <CurrencyInput id="nps-monthly" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nps-increase">Annual contribution increase (%)</Label>
                <PercentageInput id="nps-increase" value={annualIncrease} onChange={(e) => setAnnualIncrease(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nps-retire">Retirement year (Tier I only)</Label>
                <Input id="nps-retire" type="number" value={retirementYear} onChange={(e) => setRetirementYear(e.target.value)} placeholder="e.g. 2050" />
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleAddAccount} disabled={isPending}>{isPending ? "Saving…" : "Add NPS account"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">
          Total NPS corpus <span className="font-tabular text-ink">{formatCurrency(totalCorpus)}</span>
        </span>
        <Button onClick={() => setAddAccountOpen(true)}><Plus className="size-4" /> Add NPS Account</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id} className="relative flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium text-ink">{a.tier}</span>
                <span className="text-xs text-ink-muted">{a.pensionFundManager ?? "Pension fund manager not set"}</span>
              </div>
              <Badge>{a.expectedAnnualReturn ? `${a.expectedAnnualReturn}% p.a.` : "—"}</Badge>
            </div>
            <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(a.currentCorpus)}</span>
            <span className="text-xs text-ink-muted">
              {a.monthlyContribution ? `${formatCurrency(a.monthlyContribution)}/month` : "No monthly contribution set"}
              {a.retirementYear && ` · retiring ${a.retirementYear}`}
            </span>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssumptionsTarget(a);
                  setExpectedReturn(a.expectedAnnualReturn?.toString() ?? "10");
                  setMonthlyContribution(a.monthlyContribution?.toString() ?? "");
                  setAnnualIncrease(a.annualContributionIncrease?.toString() ?? "0");
                  setRetirementYear(a.retirementYear?.toString() ?? "");
                }}
              >
                <Settings className="size-3.5" /> Assumptions
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedAccountId(a.id); }}>
                View projection
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWithdrawTarget(a)} disabled={a.currentCorpus <= 0}>
                <Banknote className="size-3.5" /> Withdraw
              </Button>
            </div>
            <button onClick={() => setDeleteTarget(a)} className="absolute right-4 top-4 text-ink-muted hover:text-loss">
              <Trash2 className="size-4" />
            </button>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Projected Corpus — {selectedAccount?.tier ?? "Select an account"}</CardTitle>
            <p className="mt-1 text-xs text-ink-muted">Estimate based on your assumptions — not a guaranteed outcome.</p>
          </div>
          <Select value={selectedAccountId ?? undefined} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.tier}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!selectedAccountId || !projectionsByAccount[selectedAccountId] ? (
            <EmptyState icon={ShieldCheck} title="Set your assumptions" description="Add an expected return and monthly contribution to see a projection." />
          ) : (
            <div className="h-64 w-full">
              <NPSProjectionChart points={projectionsByAccount[selectedAccountId]!} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Contribution History</CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setContributionAccountId(accounts[0]?.id ?? ""); setContributionOpen(true); }}>
            <Plus className="size-3.5" /> Log contribution
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.every((a) => contributionsByAccount[a.id]?.length === 0) ? (
            <EmptyState icon={ShieldCheck} title="No contributions logged" description="Contributions will appear here as they're recorded." />
          ) : (
            <div className="flex flex-col divide-y divide-border-subtle">
              {accounts.flatMap((a) => contributionsByAccount[a.id] ?? []).map((c) => {
                const account = accounts.find((a) => a.id === c.npsAccountId);
                return (
                  <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-ink">{formatDate(c.contributionDate)}</span>
                      <span className="text-xs text-ink-muted">{account?.tier ?? ""}</span>
                    </div>
                    <span className="font-tabular text-ink">{formatCurrency(c.employeeAmount + c.employerAmount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {renderAddDialog()}

      <Dialog open={!!assumptionsTarget} onOpenChange={(o) => !o && setAssumptionsTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Projection assumptions — {assumptionsTarget?.tier}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-nps-return">Expected return (% p.a.)</Label>
                <PercentageInput id="edit-nps-return" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-nps-monthly">Monthly contribution</Label>
                <CurrencyInput id="edit-nps-monthly" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-nps-increase">Annual contribution increase (%)</Label>
                <PercentageInput id="edit-nps-increase" value={annualIncrease} onChange={(e) => setAnnualIncrease(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-nps-retire">Retirement year</Label>
                <Input id="edit-nps-retire" type="number" value={retirementYear} onChange={(e) => setRetirementYear(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleUpdateAssumptions} disabled={isPending}>{isPending ? "Saving…" : "Save assumptions"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log NPS contribution</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contrib-account">Account</Label>
              <Select value={contributionAccountId} onValueChange={setContributionAccountId}>
                <SelectTrigger id="contrib-account"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.tier} — {a.pensionFundManager ?? "No PFM"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contrib-amount">Amount</Label>
                <CurrencyInput id="contrib-amount" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contrib-date">Date</Label>
                <Input id="contrib-date" type="date" value={contributionDate} onChange={(e) => setContributionDate(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleAddContribution} disabled={isPending || !contributionAccountId || !contributionAmount || !contributionDate}>
              {isPending ? "Saving…" : "Log contribution"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawTarget} onOpenChange={(o) => !o && setWithdrawTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw from {withdrawTarget?.tier}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-ink-muted">
              Records a partial withdrawal — reduces this account&apos;s corpus. Real NPS rules restrict when/how
              much you can withdraw (Tier I is largely locked until retirement; Tier II is liquid) — this app
              doesn&apos;t enforce that, it just records what you tell it.
              {withdrawTarget && <> Maximum: {formatCurrency(withdrawTarget.currentCorpus)}.</>}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nps-withdraw-amount">Amount</Label>
              <CurrencyInput id="nps-withdraw-amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
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
        title="Delete NPS account?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
