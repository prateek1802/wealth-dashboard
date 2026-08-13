"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { EditAssetDialog } from "./edit-asset-dialog";
import { TransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { deleteTransactionAction } from "@/features/transactions/actions";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { ASSET_TYPE_LABELS } from "@/constants/asset-types";
import { cn } from "@/lib/utils/cn";
import { Pencil, Plus, Trash2, LineChart, Receipt } from "lucide-react";
import type { Holding } from "@/types/domain/holding";
import type { Transaction } from "@/types/domain/transaction";

export function InvestmentDetail({ holding, transactions }: { holding: Holding; transactions: Transaction[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [addTxnOpen, setAddTxnOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const { asset } = holding;
  const isGain = holding.unrealizedPnl >= 0;

  async function handleDelete(txn: Transaction) {
    const result = await deleteTransactionAction(txn.id, asset.id);
    if (result.ok) toast.success("Transaction deleted");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xl font-medium text-ink">{asset.symbol}</h2>
            <Badge>{ASSET_TYPE_LABELS[asset.assetType]}</Badge>
            {asset.exchange && <Badge>{asset.exchange}</Badge>}
          </div>
          <p className="text-sm text-ink-muted">{asset.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit Asset
          </Button>
          <Button onClick={() => setAddTxnOpen(true)}>
            <Plus className="size-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Current Value</span>
          <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(holding.currentValue, asset.currency)}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Current Price</span>
          <span className="font-tabular text-lg font-medium text-ink">{asset.currentPrice ? formatCurrency(asset.currentPrice, asset.currency) : "—"}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Quantity</span>
          <span className="font-tabular text-lg font-medium text-ink">{holding.quantity}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Avg. Cost</span>
          <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(holding.weightedAverageCost, asset.currency)}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Invested Amount</span>
          <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(holding.investedAmount, asset.currency)}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Unrealized P&amp;L</span>
          <span className={cn("font-tabular text-lg font-medium", isGain ? "text-gain" : "text-loss")}>
            {formatSignedCurrency(holding.unrealizedPnl, asset.currency)} ({formatPercent(holding.unrealizedPnlPercent)})
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Realized P&amp;L</span>
          <span className="font-tabular text-lg font-medium text-ink">{formatSignedCurrency(holding.realizedPnl, asset.currency)}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs text-ink-muted">Portfolio Allocation</span>
          <span className="font-tabular text-lg font-medium text-ink">{holding.allocationPercent.toFixed(1)}%</span>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <CardTitle>Performance</CardTitle>
        <EmptyState
          icon={LineChart}
          title="No price history yet"
          description="V1 uses manually entered prices, which have no history by definition. Connect a real market data provider later to unlock this chart."
        />
      </Card>

      {asset.notes && (
        <Card className="p-6">
          <CardTitle className="mb-2">Notes</CardTitle>
          <p className="text-sm text-ink">{asset.notes}</p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions yet" description="Add the first transaction for this asset." />
          ) : (
            <div className="flex flex-col divide-y divide-border-subtle">
              {[...transactions].reverse().map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Badge className={t.transactionType === "BUY" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}>
                        {t.transactionType}
                      </Badge>
                      {t.quantity} @ {formatCurrency(t.price, asset.currency)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(t.transactionDate)} {t.broker && `· ${t.broker}`} {(t.fees > 0 || t.taxes > 0) && `· fees/taxes ${formatCurrency(t.fees + t.taxes, asset.currency)}`}
                    </span>
                  </div>
                  <button onClick={() => setDeleteTarget(t)} className="text-ink-muted hover:text-loss">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditAssetDialog open={editOpen} onOpenChange={setEditOpen} asset={asset} />
      <TransactionDialog open={addTxnOpen} onOpenChange={setAddTxnOpen} asset={asset} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete transaction?"
        description="This cannot be undone. Holdings and P&L will be recomputed automatically."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
