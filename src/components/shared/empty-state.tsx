import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border-subtle p-10 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-ink">{title}</p>
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
