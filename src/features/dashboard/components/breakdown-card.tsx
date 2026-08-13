import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const ROWS: { key: "cash" | "equity" | "debt" | "nps" | "ppf" | "crypto" | "other"; label: string; color: string }[] = [
  { key: "cash", label: "Cash", color: "bg-[var(--gain)]" },
  { key: "equity", label: "Equity", color: "bg-[var(--accent)]" },
  { key: "debt", label: "Debt (incl. FDs)", color: "bg-[#7d9ba9]" },
  { key: "nps", label: "NPS", color: "bg-[#8a6fae]" },
  { key: "ppf", label: "PPF", color: "bg-[#c98f5e]" },
  { key: "crypto", label: "Crypto", color: "bg-[var(--loss)]" },
  { key: "other", label: "Other", color: "bg-[var(--ink-muted)]" },
];

interface Breakdown {
  cash: number;
  equity: number;
  debt: number;
  nps: number;
  ppf: number;
  crypto: number;
  other: number;
}

/**
 * Segregated breakdown — Cash / Equity / Debt / NPS / PPF / Crypto / Other —
 * computed live from portfolioService.getSegregatedBreakdown(). Purely a
 * display grouping; nothing here is stored as a category.
 */
export function BreakdownCard({ breakdown }: { breakdown: Breakdown }) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Portfolio Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {total === 0 ? (
          <p className="text-sm text-ink-muted">Add holdings, cash, FDs, NPS, or PPF to see this breakdown.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              {ROWS.map((r) => {
                const value = breakdown[r.key];
                if (value <= 0) return null;
                return <div key={r.key} className={cn("h-full", r.color)} style={{ width: `${(value / total) * 100}%` }} />;
              })}
            </div>
            <ul className="flex flex-col gap-2">
              {ROWS.filter((r) => breakdown[r.key] > 0).map((r) => (
                <li key={r.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span className={cn("size-2 rounded-full", r.color)} />
                    {r.label}
                  </span>
                  <span className="font-tabular text-ink">
                    {formatCurrency(breakdown[r.key])} · {((breakdown[r.key] / total) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
