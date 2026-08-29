"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput, DateInput } from "@/components/shared/inputs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { GoalCard } from "@/components/shared/goal-card";
import { EmptyState } from "@/components/shared/empty-state";
import { addGoalAction, updateGoalAction, deleteGoalAction } from "../actions";
import { Target, Plus } from "lucide-react";
import type { Goal } from "@/types/domain/goal";

export function GoalsView({ goals }: { goals: Goal[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("");

  function openAdd() {
    setEditTarget(null);
    setName(""); setTargetAmount(""); setCurrentAmount("0"); setTargetDate(""); setCategory("");
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditTarget(goal);
    setName(goal.name); setTargetAmount(goal.targetAmount.toString()); setCurrentAmount(goal.currentAmount.toString());
    setTargetDate(goal.targetDate ?? ""); setCategory(goal.category ?? "");
    setDialogOpen(true);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate: targetDate || null,
        category: category || null,
        description: null,
      };
      const result = editTarget ? await updateGoalAction(editTarget.id, payload) : await addGoalAction(payload);
      if (result.ok) {
        toast.success(editTarget ? "Goal updated" : "Goal added");
        setName(""); setTargetAmount(""); setCurrentAmount("0"); setTargetDate(""); setCategory("");
        setDialogOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleDelete(goal: Goal) {
    const result = await deleteGoalAction(goal.id);
    if (result.ok) toast.success("Goal removed");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Plus className="size-4" /> Add Goal</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Set a savings goal to track your progress toward it." action={<Button onClick={openAdd}><Plus className="size-4" /> Add Goal</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} onDelete={() => setDeleteTarget(g)} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit goal" : "Add goal"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-name">Name</Label>
              <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency Fund" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-target">Target amount</Label>
                <CurrencyInput id="goal-target" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-current">Current amount</Label>
                <CurrencyInput id="goal-current" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-date">Target date</Label>
                <DateInput id="goal-date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-category">Category</Label>
                <Input id="goal-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Travel" />
              </div>
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending || !name || !targetAmount}>{isPending ? "Saving…" : editTarget ? "Save changes" : "Add goal"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete goal?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
