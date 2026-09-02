"use client";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

/** Minimal trend indicator embedded inside MetricCard / InvestmentCard — no axes, no tooltip. */
export function Sparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  const data = values.map((v, i) => ({ i, v }));
  const color = positive ? "var(--gain)" : "var(--loss)";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${positive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${positive ? "up" : "down"})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
