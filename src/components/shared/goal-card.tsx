import { Card } from "@/components/ui/card";
import { Trash2, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { Goal } from "@/types/domain/goal";

/**
 * onEdit/onDelete are both optional so this stays reusable anywhere a
 * read-only goal summary is wanted (e.g. a future dashboard widget)
 * without dragging those affordances along. When provided, they sit in
 * the header's own flex row — NOT absolutely positioned from outside by
 * the caller. That absolute-overlay approach is what caused this same
 * icon-overlap bug on Bank Accounts/FDs/NPS: an externally-overlaid icon
 * collides with whatever a card renders in that same corner (here, "by
 * {targetDate}"). Fixed there by moving the action into each card's own
 * header row; same fix here.
 */
export function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit?: () => void; onDelete?: () => void }) {
  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  let monthlyRequired: number | null = null;
  if (goal.targetDate) {
    const monthsLeft = Math.max(
      1,
      // eslint-disable-next-line react-hooks/purity -- "months remaining until target date" is inherently time-dependent; this is the intended behavior, not a purity bug.
      Math.round((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    );
    monthlyRequired = remaining / monthsLeft;
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-ink">{goal.name}</span>
          {goal.category && <span className="text-xs text-ink-muted">{goal.category}</span>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {goal.targetDate && <span className="text-xs text-ink-muted">by {formatDate(goal.targetDate)}</span>}
            {onEdit && (
              <button onClick={onEdit} className="text-ink-muted hover:text-ink" title="Edit">
                <Pencil className="size-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="text-ink-muted hover:text-loss" title="Delete">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="font-tabular">{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      </div>

      {monthlyRequired !== null && remaining > 0 && (
        <span className="text-xs text-ink-muted">
          ~{formatCurrency(monthlyRequired)}/month needed to reach this on time
        </span>
      )}
    </Card>
  );
}
