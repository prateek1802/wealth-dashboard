"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ALLOCATION_CATEGORY_LABELS, type AllocationCategory } from "@/constants/asset-types";
import { formatCurrency } from "@/lib/utils/currency";
import type { AllocationSlice } from "@/types/domain/snapshot";

const PALETTE = ["#a9793f", "#3f7d58", "#6f6a5e", "#b54b3f", "#d4a25f", "#7d9ba9", "#8a6fae", "#c98f5e"];

export function AllocationDonut({ slices }: { slices: AllocationSlice[] }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="category" innerRadius="60%" outerRadius="95%" strokeWidth={0}>
              {slices.map((s, i) => (
                <Cell key={s.category} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5 overflow-y-auto text-xs">
        {slices.map((s, i) => (
          <li key={s.category} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-ink-muted">
              <span className="size-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              {ALLOCATION_CATEGORY_LABELS[s.category as AllocationCategory] ?? s.category}
            </span>
            <span className="font-tabular text-ink">{s.percentage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
