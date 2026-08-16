"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { getUpcomingRemindersAction } from "../actions";
import { cn } from "@/lib/utils/cn";
import { Bell, CalendarCheck } from "lucide-react";
import type { Reminder } from "@/lib/services/notifications.service";

function urgencyColor(daysRemaining: number): string {
  if (daysRemaining < 0) return "text-loss";
  if (daysRemaining <= 7) return "text-loss";
  if (daysRemaining <= 14) return "text-accent";
  return "text-ink-muted";
}

/**
 * Fetched once on mount rather than server-rendered — this needs to sit in
 * TopBar, which every page already renders independently, so a client-side
 * fetch avoids threading reminder data through every single page. Not
 * real-time; a page refresh or dialog reopen picks up new data.
 */
export function ReminderBell() {
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getUpcomingRemindersAction().then(setReminders);
  }, []);

  const urgentCount = reminders?.filter((r) => r.daysRemaining <= 7).length ?? 0;
  const totalCount = reminders?.length ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex size-8 items-center justify-center rounded-full border border-border-subtle bg-surface-raised text-ink-muted hover:bg-surface-sunken"
        title="Reminders"
      >
        <Bell className="size-4" />
        {totalCount > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white",
              urgentCount > 0 ? "bg-loss" : "bg-accent"
            )}
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reminders</DialogTitle>
          </DialogHeader>
          {!reminders ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : reminders.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="Nothing due soon"
              description="FD maturities, PPF's 15-year milestone, NPS retirement year, and goal target dates within 30 days show up here."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {reminders.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{r.label}</span>
                      <span className="text-xs text-ink-muted">{r.detail}</span>
                    </div>
                    <span className={cn("shrink-0 text-xs font-medium", urgencyColor(r.daysRemaining))}>
                      {r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : r.daysRemaining === 0 ? "Today" : `${r.daysRemaining}d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
