"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { PerformancePoint } from "@/types/domain/snapshot";

/**
 * Splits into two overlapping series sharing the same X axis: a solid,
 * filled area for the reconstructed-exact stretch, and a dashed, unfilled
 * line for the snapshot-approximated stretch (see
 * reconstructHistoricalNetWorth's isExact flag) — never silently presents
 * approximated history as if it were as reliable as the real thing (same
 * "be explicit about what a number does and doesn't represent" pattern as
 * the CAGR caption and Sharpe/Sortino cutoff-date work elsewhere in this
 * app). Simplifying assumption: treats the LAST point where isExact is
 * false as a single boundary — everything at or before it renders dashed,
 * everything after renders solid. In practice isExact transitions once
 * (older history is approximated, newer history becomes exact as real
 * transaction dates + backfilled prices cover it), not back and forth
 * repeatedly, so this is the honest shape of the real data, not an
 * oversimplification of it.
 */
export function PerformanceLineChart({ points }: { points: PerformancePoint[] }) {
  const lastApproxIndex = points.reduce((acc, p, i) => (p.isExact === false ? i : acc), -1);
  const hasApprox = lastApproxIndex >= 0;

  const data = points.map((p, i) => ({
    date: p.date,
    value: p.value,
    exactValue: i >= lastApproxIndex ? p.value : null,
    approxValue: i <= lastApproxIndex ? p.value : null,
  }));

  return (
    <div className="flex h-full w-full flex-col gap-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d, "d MMM")}
            tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(value) => [formatCurrency(Number(value)), "Net worth"]}
            contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
          />
          {hasApprox && (
            <Area type="monotone" dataKey="approxValue" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="5 5" fill="none" connectNulls={false} isAnimationActive={false} />
          )}
          <Area type="monotone" dataKey={hasApprox ? "exactValue" : "value"} stroke="var(--accent)" strokeWidth={2} fill="url(#netWorthFill)" connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
      {hasApprox && (
        <p className="px-1 text-[11px] text-ink-muted">
          Dashed portion is estimated from periodic snapshots, not real historical prices — solid portion is reconstructed from actual transaction dates and prices.
        </p>
      )}
    </div>
  );
}
