"use client";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatTile } from "./stat-tile";
import { XIRR_CLASSES, XIRR_CLASS_LABELS, calculateFilteredXIRR } from "@/lib/calculations/filtered-xirr";
import type { XIRRClass, XIRRAssetInput, XIRRTransactionInput } from "@/lib/calculations/filtered-xirr";
import type { CalcResult, Cashflow } from "@/lib/calculations/returns";

/**
 * All computation happens client-side on every checkbox toggle — no
 * server round-trip. This works because `holdings`/`transactions` below
 * are trimmed to just the fields calculateFilteredXIRR needs (not full
 * Asset/Transaction objects), and calculateXIRR itself is a small pure
 * function, both already fetched once by the Server Component page —
 * there's no new DATA to fetch here, only different FILTERING of what's
 * already in hand.
 *
 * Starts with every class selected, showing `defaultResult` (the page's
 * already-computed, unfiltered XIRR) UNCHANGED — not a recomputation that
 * happens to match it. Only once the user actually unchecks something does
 * this switch to calculateFilteredXIRR. This guarantees the default
 * experience is byte-for-byte identical to before this feature existed.
 */
export function XIRRSelectorCard({
  defaultResult,
  holdings,
  transactions,
  npsCashflows,
  today,
}: {
  defaultResult: CalcResult<number>;
  holdings: XIRRAssetInput[];
  transactions: XIRRTransactionInput[];
  npsCashflows: Cashflow[];
  today: string;
}) {
  const [selected, setSelected] = useState<Set<XIRRClass>>(new Set(XIRR_CLASSES));
  const allSelected = selected.size === XIRR_CLASSES.length;

  const result = useMemo(() => {
    if (allSelected) return defaultResult;
    return calculateFilteredXIRR(selected, holdings, transactions, npsCashflows, today);
  }, [allSelected, selected, defaultResult, holdings, transactions, npsCashflows, today]);

  function toggle(cls: XIRRClass) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Customizable XIRR</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {XIRR_CLASSES.map((cls) => (
            <label key={cls} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <Checkbox checked={selected.has(cls)} onCheckedChange={() => toggle(cls)} />
              {XIRR_CLASS_LABELS[cls]}
            </label>
          ))}
        </div>
        <StatTile
          label="XIRR (selected classes)"
          result={result}
          caption={allSelected ? "All classes selected · matches the default XIRR above" : "Filtered to your selection above"}
        />
      </CardContent>
    </Card>
  );
}
