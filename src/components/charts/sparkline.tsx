"use client";
import dynamic from "next/dynamic";

/**
 * See allocation-donut.tsx's doc comment for the full rationale — same
 * code-splitting pattern, real implementation now in sparkline-impl.tsx.
 * No loading fallback here (unlike the other three charts): Sparkline is
 * a small decorative trend indicator embedded inside MetricCard/
 * InvestmentCard, not a primary content element — rendering nothing while
 * its chunk loads is less disruptive than a skeleton flashing inside an
 * otherwise-already-rendered card.
 */
export const Sparkline = dynamic(() => import("./sparkline-impl").then((m) => m.Sparkline), { ssr: false });
