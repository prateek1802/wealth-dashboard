"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils/date";
import { AUDIT_TABLE_LABELS } from "@/types/domain/audit";
import { buildDiffRows } from "@/lib/audit/build-diff";
import { restoreAuditLogEntryAction } from "../actions";
import { History, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import type { AuditLogEntry } from "@/types/domain/audit";

function EntryRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rows = buildDiffRows(entry);
  const label = AUDIT_TABLE_LABELS[entry.tableName] ?? entry.tableName;

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreAuditLogEntryAction(entry.id);
      if (result.ok) toast.success(`${label} restored`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="border-b border-border-subtle last:border-0">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-surface-sunken">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-3 text-left">
          {open ? <ChevronDown className="size-4 text-ink-muted" /> : <ChevronRight className="size-4 text-ink-muted" />}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink">{label}</span>
            <span className="text-xs text-ink-muted">{formatDate(entry.changedAt, "d MMM yyyy, HH:mm")}</span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {entry.action === "delete" && (
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={isPending}>
              <Undo2 className="size-3.5" /> {isPending ? "Restoring…" : "Restore"}
            </Button>
          )}
          <Badge className={entry.action === "delete" ? "border-loss/30 bg-loss/10 text-loss" : "border-accent/30 bg-accent-soft text-accent"}>
            {entry.action === "delete" ? "Deleted" : "Edited"}
          </Badge>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4">
          {rows.length === 0 ? (
            <p className="text-xs text-ink-muted">No field-level changes recorded.</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border-subtle">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sunken text-ink-muted">
                    <th className="px-3 py-2 text-left font-medium">Field</th>
                    <th className="px-3 py-2 text-left font-medium">{entry.action === "delete" ? "Value (deleted)" : "Before"}</th>
                    {entry.action === "update" && <th className="px-3 py-2 text-left font-medium">After</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.field} className="border-b border-border-subtle last:border-0">
                      <td className="px-3 py-2 font-mono text-ink-muted">{r.field}</td>
                      <td className="px-3 py-2 text-ink">{r.before}</td>
                      {entry.action === "update" && <td className="px-3 py-2 text-ink">{r.after}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Restore this ${label.toLowerCase()}?`}
        description={`This brings back exactly what was deleted, including its original date and ID. If it was a ${label.toLowerCase()} that other records depend on (e.g. an investment with transactions), only this record itself comes back — related records deleted separately need their own restore.`}
        onConfirm={handleRestore}
        confirmLabel="Restore"
        destructive={false}
      />
    </div>
  );
}

export function AuditLogView({ entries, isDemoMode }: { entries: AuditLogEntry[]; isDemoMode: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      {isDemoMode && (
        <p className="text-xs text-ink-muted">
          Demo mode has no database triggers to populate this from — connect a real Supabase project to see history here.
        </p>
      )}
      {entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No edits or deletes yet"
          description="Every future edit or delete to a transaction, investment, FD, NPS record, and more will show up here automatically — nothing to set up."
        />
      ) : (
        <Card className="flex flex-col">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </Card>
      )}
    </div>
  );
}
