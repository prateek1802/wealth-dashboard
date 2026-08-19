"use client";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportBackupAction, importBackupAction } from "../actions";
import { Download, UploadCloud, CheckCircle2, AlertTriangle, DatabaseBackup } from "lucide-react";
import type { BackupImportSummary } from "@/lib/services/backup.service";

const ENTITY_LABELS: Record<keyof Omit<BackupImportSummary, "errors">, string> = {
  assets: "Assets",
  transactions: "Transactions",
  goals: "Goals",
  fixedDeposits: "Fixed Deposits",
  npsAccounts: "NPS Accounts",
  npsContributions: "NPS Contributions",
  ppfAccounts: "PPF Accounts",
  bankAccounts: "Bank Accounts",
  liabilities: "Liabilities",
  watchlistItems: "Watchlist Items",
};

export function BackupView({ isDemoMode }: { isDemoMode: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, startExport] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [summary, setSummary] = useState<BackupImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startExport(async () => {
      try {
        const backup = await exportBackupAction();
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `wealth-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Backup downloaded");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setError(message);
        toast.error(message);
      }
    });
  }

  function handleFile(file: File) {
    setSummary(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      startImport(async () => {
        try {
          const parsed = JSON.parse(String(reader.result ?? ""));
          const result = await importBackupAction(parsed);
          if (result.ok) {
            setSummary(result.summary);
            toast.success("Backup imported");
          } else {
            setError(result.error);
          }
        } catch {
          setError("That file isn't valid JSON.");
        }
      });
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {isDemoMode && (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-accent/30 bg-accent-soft p-4 text-sm text-ink">
          <DatabaseBackup className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="font-medium">You&apos;re running in demo mode</p>
            <p className="mt-1 text-ink-muted">
              Nothing you enter persists across a server restart — no Supabase project is connected yet (see SETUP.md).
              Export a backup before you stop the dev server, and import it again after you start it — that&apos;s the
              whole workflow until you connect a real database, and it takes a few seconds either way.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Export everything</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-ink-muted">
              Downloads one JSON file with every asset, transaction, goal, fixed deposit, NPS account, PPF account,
              bank account, and watchlist item.
            </p>
            <Button onClick={handleExport} disabled={isExporting} className="w-fit">
              <Download className="size-4" /> {isExporting ? "Preparing…" : "Export backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Import a backup</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-ink-muted">
              Import is <span className="font-medium text-ink">additive</span> — it adds records, never deletes or
              overwrites. Re-importing the same file twice will duplicate everything, so only import into a fresh
              instance (the normal case right after a restart).
            </p>
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-4 py-2 text-sm font-medium text-ink hover:bg-surface-sunken">
              <UploadCloud className="size-4" />
              {isImporting ? "Importing…" : "Choose backup file"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={isImporting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-loss/30 bg-loss-soft p-3 text-sm text-loss">
          <AlertTriangle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {summary && (
        <Card>
          <CardHeader><CardTitle>Import result</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(ENTITY_LABELS) as (keyof typeof ENTITY_LABELS)[]).map((key) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-gain" />
                  <span className="text-ink-muted">{ENTITY_LABELS[key]}</span>
                  <span className="font-tabular text-ink">{summary[key]}</span>
                </div>
              ))}
            </div>
            {summary.errors.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[var(--radius-control)] border border-loss/30 bg-loss-soft p-3 text-xs text-loss">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="size-3.5" /> {summary.errors.length} issue{summary.errors.length === 1 ? "" : "s"}
                </div>
                <ul className="flex flex-col gap-1">
                  {summary.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                  {summary.errors.length > 20 && <li>…and {summary.errors.length - 20} more.</li>}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
