import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { FDWithProjection } from "@/lib/services/fd.service";
import type { ReactNode } from "react";

/** `actions` renders inline next to the maturity badge — NOT absolutely positioned over it, which is what caused the two to visually overlap before. */
export function FDCard({ fd, actions }: { fd: FDWithProjection; actions?: ReactNode }) {
  const matured = fd.daysRemaining <= 0;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-ink">{fd.institution}</span>
          <span className="text-xs text-ink-muted">{fd.interestRate}% p.a. · {fd.tenureMonths} months</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="whitespace-nowrap rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">
            {matured ? "Matured" : `${fd.daysRemaining}d left`}
          </span>
          {actions}
        </div>
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
