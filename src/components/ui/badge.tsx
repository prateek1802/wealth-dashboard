import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border-subtle bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted",
        className
      )}
      {...props}
    />
  );
}
