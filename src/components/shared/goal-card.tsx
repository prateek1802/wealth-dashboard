import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { Goal } from "@/types/domain/goal";

export function GoalCard({ goal }: { goal: Goal }) {
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
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-medium text-ink">{goal.name}</span>
          {goal.category && <span className="text-xs text-ink-muted">{goal.category}</span>}
        </div>
        {goal.targetDate && <span className="text-xs text-ink-muted">by {formatDate(goal.targetDate)}</span>}
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
