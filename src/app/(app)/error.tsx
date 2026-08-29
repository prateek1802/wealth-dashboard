"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

/**
 * Catches errors thrown by any (app)-group page or its Server Components.
 * Scoped to this route group (not the root) specifically so the sidebar
 * and mobile nav — rendered by (app)/layout.tsx, the PARENT of this
 * boundary — stay intact: only the page content underneath is replaced by
 * this fallback, not the whole app shell. Before this fix there was no
 * error.tsx anywhere in the App Router, so an unhandled error on any page
 * fell through to Next.js's generic unstyled error screen with no way to
 * recover without a full page reload.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 lg:p-8">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-loss/10 text-loss">
          <AlertTriangle className="size-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">Something went wrong loading this page</p>
          <p className="text-sm text-ink-muted">
            {error.message || "An unexpected error occurred."}
            {error.digest && <span className="mt-1 block font-mono text-xs text-ink-muted/70">Ref: {error.digest}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window.location.href = ROUTES.dashboard)}>
            Go to Dashboard
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </div>
  );
}
