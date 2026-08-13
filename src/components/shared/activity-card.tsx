import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";
import type { ActivityItem } from "@/types/domain/snapshot";

export function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" description="Transactions and contributions will show up here." />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="text-xs text-ink-muted">{item.detail}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-tabular text-ink">{formatCurrency(item.amount)}</span>
                  <span className="text-xs text-ink-muted">{formatDate(item.date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
