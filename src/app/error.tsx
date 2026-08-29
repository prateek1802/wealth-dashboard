"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Covers the landing page and /login — the (app) route group has its own
 * error.tsx (keeps the sidebar intact on a crash there), so this only
 * catches errors outside it. No app chrome to preserve here, so this is
 * just centered on a bare page.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-loss/10 text-loss">
          <AlertTriangle className="size-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">Something went wrong</p>
          <p className="text-sm text-ink-muted">
            {error.message || "An unexpected error occurred."}
            {error.digest && <span className="mt-1 block font-mono text-xs text-ink-muted/70">Ref: {error.digest}</span>}
          </p>
        </div>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  );
}
