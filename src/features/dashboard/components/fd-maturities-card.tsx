import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { PiggyBank } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { FDWithProjection } from "@/lib/services/fd.service";

export function FDMaturitiesCard({ fds }: { fds: FDWithProjection[] }) {
  const upcoming = [...fds].filter((f) => f.status === "active" && f.daysRemaining > 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Upcoming FD Maturities</CardTitle>
        <Link href={ROUTES.fixedDeposits} className="text-xs font-medium text-accent">View all</Link>
      </CardHeader>
      <CardContent className="flex-1">
        {upcoming.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No FDs tracked" description="Fixed deposits nearing maturity will show up here." />
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.slice(0, 4).map((fd) => (
              <li key={fd.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-ink">{fd.institution}</span>
                  <span className="text-xs text-ink-muted">{formatDate(fd.maturityDate)} · {fd.daysRemaining}d</span>
                </div>
                <span className="font-tabular text-ink">{formatCurrency(fd.projectedMaturityAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
