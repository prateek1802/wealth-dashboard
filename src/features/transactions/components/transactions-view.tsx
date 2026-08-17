"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TransactionDialog } from "./transaction-dialog";
import { ImportCSVDialog } from "./import-csv-dialog";
import { deleteTransactionAction } from "../actions";
import { formatCurrency, formatCurrencyPrecise } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { toCSV, downloadCSV } from "@/lib/utils/csv-export";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";
import { cn } from "@/lib/utils/cn";
import { Receipt, Plus, Download, Upload, Trash2 } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { Transaction } from "@/types/domain/transaction";
import type { Asset } from "@/types/domain/asset";

interface Row extends Transaction {
  asset: Asset | undefined;
}

export function TransactionsView({ rows }: { rows: Row[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  function handleExport() {
    const csv = toCSV(
      rows.map((r) => ({
        date: r.transactionDate,
        symbol: r.asset?.symbol ?? "",
        name: r.asset?.name ?? "",
        assetType: r.asset?.assetType ?? "",
        type: r.transactionType,
        quantity: r.quantity,
        price: r.price,
        fees: r.fees,
        taxes: r.taxes,
        currency: r.asset?.currency ?? "INR",
        exchange: r.asset?.exchange ?? "",
        broker: r.broker ?? "",
        notes: r.notes ?? "",
      })),
      ["date", "symbol", "name", "assetType", "type", "quantity", "price", "fees", "taxes", "currency", "exchange", "broker", "notes"]
    );
    downloadCSV("transactions.csv", csv);
  }

  async function handleDelete(row: Row) {
    const result = await deleteTransactionAction(row.id, row.assetId);
    if (result.ok) toast.success("Transaction deleted");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">{rows.length} transaction{rows.length === 1 ? "" : "s"}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" /> Import CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Add Investment
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions yet" description="Every BUY and SELL you record will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-surface-sunken text-left text-xs font-medium text-ink-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Fees + Taxes</th>
                <th className="px-4 py-3">Broker</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-sunken">
                  <td className="px-4 py-3 text-ink-muted">{formatDate(r.transactionDate)}</td>
                  <td className="px-4 py-3">
                    {r.asset ? (
                      <Link href={ROUTES.investmentDetail(r.asset.id)} className={cn("font-medium text-ink hover:text-accent", r.asset.assetType !== "mutual_fund" && r.asset.assetType !== "mutual_fund_debt" && "font-mono")}>
                        {getAssetDisplayLabel(r.asset).primary}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={r.transactionType === "BUY" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}>{r.transactionType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-tabular">{r.quantity}</td>
                  <td className="px-4 py-3 text-right font-tabular">{formatCurrencyPrecise(r.price, r.asset?.currency)}</td>
                  <td className="px-4 py-3 text-right font-tabular text-ink-muted">{formatCurrency(r.fees + r.taxes, r.asset?.currency)}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.broker ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteTarget(r)} className="text-ink-muted hover:text-loss">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ImportCSVDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete transaction?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
