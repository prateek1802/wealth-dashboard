"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { PerformancePoint } from "@/types/domain/snapshot";

export function PerformanceLineChart({ points }: { points: PerformancePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#netWorthFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
