"use client";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { importNPSStatementAction } from "../actions";
import { formatCurrency } from "@/lib/utils/currency";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import type { NPSAccount } from "@/types/domain/nps";
import type { NPSImportSummary } from "@/lib/services/nps.service";

export function ImportNPSStatementDialog({ account, open, onOpenChange }: { account: NPSAccount; open: boolean; onOpenChange: (o: boolean) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<NPSImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFileName(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setSummary(null);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await importNPSStatementAction(account.id, formData);
      if (result.ok) {
        setSummary(result.summary);
        if (result.summary.newRowsInserted > 0) {
          toast.success(`Imported ${result.summary.newRowsInserted} new transaction${result.summary.newRowsInserted === 1 ? "" : "s"}`);
        } else {
          toast.info("Nothing new to import — every row in that file is already on file.");
        }
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import NPS statement</DialogTitle>
          <DialogDescription>
            Upload your consolidated statement from NSDL/Protean (.xlsx, one sheet per scheme) or a single-period export (.csv) for {account.tier}. Safe to
            re-upload the same or an overlapping file — anything already on file is skipped, never duplicated.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border-subtle p-6 text-center hover:bg-surface-sunken">
            <UploadCloud className="size-6 text-ink-muted" />
            <span className="text-sm text-ink">{fileName ?? "Click to choose a .xlsx or .csv file"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          {isPending && <p className="text-sm text-ink-muted">Reading and importing…</p>}
          {error && <p className="text-sm text-loss">{error}</p>}

          {summary && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-ink">
                <CheckCircle2 className="size-4 text-gain" />
                {summary.newRowsInserted} new transaction{summary.newRowsInserted === 1 ? "" : "s"} imported
                {summary.alreadyImported > 0 && ` · ${summary.alreadyImported} already on file`}.
              </div>
              <p className="text-xs text-ink-muted">Total invested (contributions) in this file: {formatCurrency(summary.totalInvested)}</p>

              {summary.unrecognizedRows > 0 && (
                <div className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-loss/30 bg-loss-soft p-3 text-xs text-loss">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {summary.unrecognizedRows} row{summary.unrecognizedRows === 1 ? "" : "s"} in that file used wording we didn&apos;t recognize and{" "}
                  {summary.unrecognizedRows === 1 ? "was" : "were"} skipped rather than guessed at — nothing was imported for {summary.unrecognizedRows === 1 ? "it" : "them"}.
                </div>
              )}

              {summary.switchWarnings.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-loss/30 bg-loss-soft p-3 text-xs text-loss">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {summary.switchWarnings.length} scheme switch{summary.switchWarnings.length === 1 ? "" : "es"} couldn&apos;t be matched to its counterpart —
                  the transaction itself was still imported.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
