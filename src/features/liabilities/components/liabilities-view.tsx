"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput, PercentageInput } from "@/components/shared/inputs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { addLiabilityAction, updateLiabilityAction, deleteLiabilityAction } from "../actions";
import { LIABILITY_TYPES, LIABILITY_TYPE_LABELS } from "@/constants/liabilities";
import { formatCurrency } from "@/lib/utils/currency";
import { AlertTriangle, Plus, Trash2, Pencil } from "lucide-react";
import type { Liability } from "@/types/domain/liability";
import type { LiabilityType } from "@/constants/liabilities";

export function LiabilitiesView({ liabilities }: { liabilities: Liability[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Liability | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [liabilityType, setLiabilityType] = useState<LiabilityType>("credit_card");
  const [amountOwed, setAmountOwed] = useState("");
  const [interestRate, setInterestRate] = useState("");

  const totalOwed = liabilities.reduce((s, l) => s + l.amountOwed, 0);

  function resetForm() {
    setName(""); setLiabilityType("credit_card"); setAmountOwed(""); setInterestRate("");
  }

  function openAdd() {
    resetForm();
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(l: Liability) {
    setName(l.name);
    setLiabilityType(l.liabilityType);
    setAmountOwed(l.amountOwed.toString());
    setInterestRate(l.interestRate?.toString() ?? "");
    setEditTarget(l);
    setDialogOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name,
        liabilityType,
        amountOwed: Number(amountOwed),
        interestRate: interestRate ? Number(interestRate) : null,
        notes: null,
      };
      const result = editTarget ? await updateLiabilityAction(editTarget.id, payload) : await addLiabilityAction(payload);
      if (result.ok) {
        toast.success(editTarget ? "Liability updated" : "Liability added");
        resetForm();
        setDialogOpen(false);
      } else setError(result.error);
    });
  }

  async function handleDelete(l: Liability) {
    const result = await deleteLiabilityAction(l.id);
    if (result.ok) toast.success("Liability removed");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">
          Total owed <span className="font-tabular text-loss">{formatCurrency(totalOwed)}</span>
        </span>
        <Button onClick={openAdd}><Plus className="size-4" /> Add Liability</Button>
      </div>

      {liabilities.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No liabilities tracked" description="Add credit card dues or loans — these subtract from your net worth." action={<Button onClick={openAdd}><Plus className="size-4" /> Add Liability</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liabilities.map((l) => (
            <Card key={l.id} className="relative flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{l.name}</span>
                <Badge>{LIABILITY_TYPE_LABELS[l.liabilityType]}</Badge>
              </div>
              <span className="font-tabular text-lg font-medium text-loss">{formatCurrency(l.amountOwed)}</span>
              {l.interestRate !== null && <span className="text-xs text-ink-muted">{l.interestRate}% p.a.</span>}
              <div className="mt-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(l)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </div>
              <button onClick={() => setDeleteTarget(l)} className="absolute right-4 top-4 text-ink-muted hover:text-loss">
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit liability" : "Add liability"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="liability-name">Name</Label>
              <Input id="liability-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC Credit Card" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="liability-type">Type</Label>
                <Select value={liabilityType} onValueChange={(v) => setLiabilityType(v as LiabilityType)}>
                  <SelectTrigger id="liability-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((t) => <SelectItem key={t} value={t}>{LIABILITY_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="liability-amount">Amount owed</Label>
                <CurrencyInput id="liability-amount" value={amountOwed} onChange={(e) => setAmountOwed(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="liability-rate">Interest rate (% p.a., optional)</Label>
              <PercentageInput id="liability-rate" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending || !name || !amountOwed}>
              {isPending ? "Saving…" : editTarget ? "Save changes" : "Add liability"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete liability?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
