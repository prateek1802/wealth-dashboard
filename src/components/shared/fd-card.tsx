import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { FDWithProjection } from "@/lib/services/fd.service";

export function FDCard({ fd }: { fd: FDWithProjection }) {
  const matured = fd.daysRemaining <= 0;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-medium text-ink">{fd.institution}</span>
          <span className="text-xs text-ink-muted">{fd.interestRate}% p.a. · {fd.tenureMonths} months</span>
        </div>
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">
          {matured ? "Matured" : `${fd.daysRemaining}d left`}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(fd.principal)}</span>
        <span className="text-xs text-gain">+{formatCurrency(fd.expectedInterest)}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>Maturity {formatDate(fd.maturityDate)}</span>
        <span className="font-tabular">{formatCurrency(fd.projectedMaturityAmount)}</span>
      </div>
    </Card>
  );
}
