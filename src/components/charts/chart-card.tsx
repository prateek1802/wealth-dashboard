"use client";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Generic wrapper: title + optional period/action slot + chart body. Feature-agnostic — used by dashboard, analytics, NPS, FD screens alike. */
export function ChartCard({ title, action, children, className }: ChartCardProps) {
  return (
    <Card className={cn("flex h-full flex-col gap-4 p-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <CardTitle className="text-sm font-medium text-ink-muted">{title}</CardTitle>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </Card>
  );
}
