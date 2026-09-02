"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * See allocation-donut.tsx's doc comment for the full rationale — same
 * code-splitting pattern, real implementation now in
 * performance-line-chart-impl.tsx.
 */
export const PerformanceLineChart = dynamic(() => import("./performance-line-chart-impl").then((m) => m.PerformanceLineChart), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
