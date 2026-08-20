"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/shared/inputs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { addBankAccountAction, updateBankAccountBalanceAction, deleteBankAccountAction } from "../actions";
import { BANK_ACCOUNT_TYPES, BANK_ACCOUNT_TYPE_LABELS } from "@/constants/bank-accounts";
import { formatCurrency } from "@/lib/utils/currency";
import { Banknote, Plus, Trash2, Pencil } from "lucide-react";
import type { BankAccount } from "@/types/domain/bank-account";
import type { BankAccountType } from "@/constants/bank-accounts";

export function BankAccountsView({ accounts }: { accounts: BankAccount[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<BankAccountType>("savings");
  const [currentBalance, setCurrentBalance] = useState("");
  const [editBalance, setEditBalance] = useState("");

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addBankAccountAction({ bankName, accountType, currentBalance: Number(currentBalance), notes: null });
      if (result.ok) {
        toast.success("Bank account added");
        setBankName(""); setCurrentBalance("");
        setDialogOpen(false);
      } else setError(result.error);
    });
  }

  function handleUpdateBalance() {
    if (!editTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await updateBankAccountBalanceAction(editTarget.id, Number(editBalance));
      if (result.ok) {
        toast.success("Balance updated");
        setEditTarget(null);
      } else setError(result.error);
    });
  }

  async function handleDelete(account: BankAccount) {
    const result = await deleteBankAccountAction(account.id);
    if (result.ok) toast.success("Bank account removed");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">
          Total cash <span className="font-tabular text-ink">{formatCurrency(totalBalance)}</span>
        </span>
        <Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add Bank Account</Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon={Banknote} title="No bank accounts tracked" description="Add your savings, current, or salary accounts to include cash in your net worth." action={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add Bank Account</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{a.bankName}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge>{BANK_ACCOUNT_TYPE_LABELS[a.accountType]}</Badge>
                  <button onClick={() => setDeleteTarget(a)} className="text-ink-muted hover:text-loss" title="Delete">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(a.currentBalance)}</span>
              <div className="mt-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditTarget(a); setEditBalance(a.currentBalance.toString()); }}>
                  <Pencil className="size-3.5" /> Update balance
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add bank account</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-name">Bank name</Label>
              <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HDFC Bank" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bank-type">Account type</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as BankAccountType)}>
                  <SelectTrigger id="bank-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANK_ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{BANK_ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bank-balance">Current balance</Label>
                <CurrencyInput id="bank-balance" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending || !bankName || !currentBalance}>
              {isPending ? "Saving…" : "Add bank account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update balance</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank-edit-balance">Current balance</Label>
              <CurrencyInput id="bank-edit-balance" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleUpdateBalance} disabled={isPending || !editBalance}>{isPending ? "Saving…" : "Update balance"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete bank account?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
