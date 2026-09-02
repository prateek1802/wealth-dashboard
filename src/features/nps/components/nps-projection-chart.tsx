"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * See components/charts/allocation-donut.tsx's doc comment for the full
 * code-splitting rationale — same pattern, real implementation moved to
 * nps-projection-chart-impl.tsx UNCHANGED (byte-for-byte copy). This file
 * only changes HOW the chart is loaded (a separate JS chunk, fetched on
 * render instead of bundled eagerly) — no NPS data, NAV, staleness, or
 * import logic is touched by this at all.
 */
export const NPSProjectionChart = dynamic(() => import("./nps-projection-chart-impl").then((m) => m.NPSProjectionChart), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
