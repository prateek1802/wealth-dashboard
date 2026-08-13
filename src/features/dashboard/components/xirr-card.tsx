import { Card } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/currency";
import type { CalcResult } from "@/lib/calculations/returns";

export function XIRRCard({ xirr }: { xirr: CalcResult<number> }) {
  return (
    <Card className="flex h-full flex-col justify-between gap-3 p-6">
      <span className="text-sm font-medium text-ink-muted">Portfolio XIRR</span>
      {xirr.status === "ok" ? (
        <span className="font-display font-tabular text-3xl text-ink">{formatPercent(xirr.value)}</span>
      ) : (
        <span className="text-sm text-ink-muted">{xirr.reason}</span>
      )}
    </Card>
  );
}
