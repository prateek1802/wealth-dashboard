"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * recharts previously shipped in the initial JS bundle for EVERY page that
 * imported this — including pages where the chart isn't the first thing
 * rendered. next/dynamic splits the real implementation
 * (allocation-donut-impl.tsx) into its own chunk, loaded only when this
 * component actually renders. `ssr: false` because ResponsiveContainer
 * needs real DOM measurements to lay out — it can't render anything
 * meaningful during SSR anyway, so skipping SSR for it avoids a
 * guaranteed hydration mismatch instead of causing one.
 *
 * Every caller keeps importing from this exact path — nothing else in the
 * codebase needs to change.
 */
export const AllocationDonut = dynamic(() => import("./allocation-donut-impl").then((m) => m.AllocationDonut), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});
