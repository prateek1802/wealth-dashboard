import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { Target } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { Goal } from "@/types/domain/goal";

export function GoalsSummaryCard({ goals }: { goals: Goal[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Goals</CardTitle>
        <Link href={ROUTES.goals} className="text-xs font-medium text-accent">View all</Link>
      </CardHeader>
      <CardContent className="flex-1">
        {goals.length === 0 ? (
          <EmptyState icon={Target} title="No goals yet" description="Set a savings goal to track progress here." />
        ) : (
          <ul className="flex flex-col gap-4">
            {goals.slice(0, 3).map((g) => {
              const progress = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
              return (
                <li key={g.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{g.name}</span>
                    <span className="text-xs text-ink-muted">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-ink-muted font-tabular">
                    {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
