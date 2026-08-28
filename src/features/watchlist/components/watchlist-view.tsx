"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/shared/inputs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SymbolCombobox } from "@/features/transactions/components/symbol-combobox";
import { addWatchlistItemAction, removeWatchlistItemAction } from "../actions";
import { SECURITY_ASSET_TYPES, ASSET_TYPE_LABELS } from "@/constants/asset-types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { Eye, Plus, Trash2 } from "lucide-react";
import type { WatchlistItem } from "@/types/domain/watchlist";
import type { AssetType } from "@/constants/asset-types";
import type { SymbolSearchResult } from "@/lib/market-data/symbol-search";

export function WatchlistView({ items }: { items: WatchlistItem[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WatchlistItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock_in");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [note, setNote] = useState("");

  function handleSelectResult(result: SymbolSearchResult) {
    setSymbol(result.symbol);
    setName(result.name);
    setAssetType(result.assetType);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addWatchlistItemAction({
        asset: { symbol, name, assetType, currency: "INR", exchange: null, sector: null, country: null, isin: null, notes: null },
        targetPrice: targetPrice ? Number(targetPrice) : null,
        stopLoss: stopLoss ? Number(stopLoss) : null,
        note: note || null,
      });
      if (result.ok) {
        toast.success("Added to watchlist");
        setSymbol(""); setName(""); setTargetPrice(""); setStopLoss(""); setNote("");
        setDialogOpen(false);
      } else setError(result.error);
    });
  }

  async function handleDelete(item: WatchlistItem) {
    const result = await removeWatchlistItemAction(item.id);
    if (result.ok) toast.success("Removed from watchlist");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add to Watchlist</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Eye} title="Nothing on your watchlist" description="Track assets you're considering without adding them to your holdings." action={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Add to Watchlist</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="relative flex flex-col gap-3 p-5">
              <div className="flex flex-col">
                <span className="font-mono font-medium text-ink">{item.asset.symbol}</span>
                <span className="text-xs text-ink-muted">{item.asset.name}</span>
              </div>
              {item.asset.currentPrice !== null ? (
                <div className="flex flex-col">
                  <span className="font-tabular text-lg font-medium text-ink">{formatCurrency(item.asset.currentPrice, item.asset.currency)}</span>
                  {item.asset.currentPriceUpdatedAt && (
                    <span className="text-xs text-ink-muted">as of {formatDate(item.asset.currentPriceUpdatedAt)}</span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-ink-muted">No price yet — refresh to fetch one.</span>
              )}
              <div className="flex justify-between text-xs text-ink-muted">
                {item.targetPrice && (
                  <span className={item.asset.currentPrice !== null && item.asset.currentPrice >= item.targetPrice ? "text-gain" : undefined}>
                    Target {formatCurrency(item.targetPrice, item.asset.currency)}
                  </span>
                )}
                {item.stopLoss && (
                  <span className={item.asset.currentPrice !== null && item.asset.currentPrice <= item.stopLoss ? "text-loss" : undefined}>
                    Stop-loss {formatCurrency(item.stopLoss, item.asset.currency)}
                  </span>
                )}
              </div>
              {item.note && <p className="text-sm text-ink">{item.note}</p>}
              <button onClick={() => setDeleteTarget(item)} className="absolute right-4 top-4 text-ink-muted hover:text-loss">
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add to watchlist</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wl-symbol">Symbol / search</Label>
              <SymbolCombobox symbol={symbol} onSymbolChange={setSymbol} onSelectResult={handleSelectResult} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wl-type">Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger id="wl-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECURITY_ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{ASSET_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wl-name">Name</Label>
              <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wl-target">Target price</Label>
                <CurrencyInput id="wl-target" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wl-stop">Stop-loss</Label>
                <CurrencyInput id="wl-stop" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wl-note">Note</Label>
              <Input id="wl-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add on dips below…" />
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending || !symbol || !name}>{isPending ? "Saving…" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove from watchlist?"
        description="This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
