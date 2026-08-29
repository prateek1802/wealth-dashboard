import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Shown automatically by Next.js (via the implicit Suspense boundary this
 * file creates) while any (app)-group page's async Server Component work
 * is still in flight — e.g. the first paint of a page that fetches from
 * Supabase. Before this fix there was no loading.tsx anywhere in the App
 * Router, so navigating to a page with a slow fetch showed nothing at all
 * until it finished, instead of an immediate skeleton.
 *
 * Deliberately generic (a card grid), not tailored per page — this file
 * can't know which page it's covering. Good enough to make navigation
 * feel instant instead of frozen; not meant to pixel-match every page's
 * final layout.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-32" />
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </Card>
    </div>
  );
}
