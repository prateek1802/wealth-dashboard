"use client";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { parseTransactionsCSV, TRANSACTION_IMPORT_TEMPLATE } from "@/lib/utils/csv-import";
import { downloadCSV } from "@/lib/utils/csv-export";
import { importTransactionsCSVAction } from "../actions";
import { UploadCloud, FileDown, CheckCircle2, AlertTriangle } from "lucide-react";
import type { TransactionImportSummary } from "@/lib/validation/transaction-import.schema";

export function ImportCSVDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<TransactionImportSummary | null>(null);
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
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseTransactionsCSV(text);
      startTransition(async () => {
        const result = await importTransactionsCSVAction(rows);
        if (result.ok) {
          setSummary(result.summary);
          if (result.summary.imported > 0) {
            toast.success(`Imported ${result.summary.imported} of ${result.summary.totalRows} transaction${result.summary.totalRows === 1 ? "" : "s"}`);
          } else if (result.summary.duplicates > 0 && result.summary.failed.length === 0) {
            toast.info("Nothing new to import — every row was already imported.");
          }
        } else {
          setError(result.error);
        }
      });
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  function handleDownloadTemplate() {
    downloadCSV("transactions-import-template.csv", TRANSACTION_IMPORT_TEMPLATE);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import transactions from CSV</DialogTitle>
          <DialogDescription>
            Bulk-add years of trades in one go. Each row creates the asset if it doesn&apos;t exist yet, then records the transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-control)] border border-border-subtle bg-surface-sunken p-3 text-xs text-ink-muted">
            <p className="font-medium text-ink">Required columns</p>
            <p className="mt-1">
              <code className="font-mono">date, symbol, name, assetType, type, quantity, price</code>
            </p>
            <p className="mt-2">
              Optional: <code className="font-mono">fees, taxes, currency, exchange, broker, notes</code>. Column
              names are matched loosely (spaces/underscores/case don&apos;t matter). <code className="font-mono">assetType</code> must be one of:{" "}
              <code className="font-mono">stock_in, stock_us, etf, mutual_fund, mutual_fund_debt, bond, crypto, other</code>{" "}
              (not <code className="font-mono">cash</code> — use Bank Accounts for that). <code className="font-mono">type</code> is <code className="font-mono">BUY</code> or <code className="font-mono">SELL</code>.
              For mutual funds, use the mfapi.in scheme code as the symbol if you want Refresh Prices to work later.
            </p>
            <button onClick={handleDownloadTemplate} className="mt-2 inline-flex items-center gap-1.5 font-medium text-accent">
              <FileDown className="size-3.5" /> Download a template
            </button>
          </div>

          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border-subtle p-6 text-center hover:bg-surface-sunken"
          >
            <UploadCloud className="size-6 text-ink-muted" />
            <span className="text-sm text-ink">{fileName ?? "Click to choose a CSV file"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          {isPending && <p className="text-sm text-ink-muted">Importing…</p>}
          {error && <p className="text-sm text-loss">{error}</p>}

          {summary && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-ink">
                <CheckCircle2 className="size-4 text-gain" />
                Imported {summary.imported} of {summary.totalRows} row{summary.totalRows === 1 ? "" : "s"}.
              </div>
              {summary.duplicates > 0 && (
                <p className="text-xs text-ink-muted">
                  {summary.duplicates} row{summary.duplicates === 1 ? "" : "s"} already imported — skipped, not duplicated.
                </p>
              )}
              {summary.failed.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-[var(--radius-control)] border border-loss/30 bg-loss-soft p-3 text-xs text-loss">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="size-3.5" /> {summary.failed.length} row{summary.failed.length === 1 ? "" : "s"} skipped
                  </div>
                  <ul className="flex flex-col gap-1">
                    {summary.failed.slice(0, 20).map((f) => (
                      <li key={f.rowNumber}>
                        Row {f.rowNumber}{f.symbol ? ` (${f.symbol})` : ""}: {f.error}
                      </li>
                    ))}
                    {summary.failed.length > 20 && <li>…and {summary.failed.length - 20} more.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
