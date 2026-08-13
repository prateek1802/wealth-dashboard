import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { CalcResult } from "@/lib/calculations/returns";

interface StatTileProps {
  label: string;
  result: CalcResult<number>;
  format?: (value: number) => string;
  colorByValue?: boolean;
}

export function StatTile({ label, result, format = (v) => `${v.toFixed(2)}%`, colorByValue = false }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-1.5 p-5">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {result.status === "ok" ? (
        <span className={cn("font-tabular text-xl font-medium", colorByValue ? (result.value >= 0 ? "text-gain" : "text-loss") : "text-ink")}>
          {format(result.value)}
        </span>
      ) : (
        <span className="text-xs text-ink-muted">{result.reason}</span>
      )}
    </Card>
  );
}
