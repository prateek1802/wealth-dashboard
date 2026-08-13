"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import type { NPSProjectionPoint } from "@/types/domain/nps";

export function NPSProjectionChart({ points }: { points: NPSProjectionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} width={80} />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Projected corpus"]}
          contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
        />
        <Line type="monotone" dataKey="corpus" stroke="var(--accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
