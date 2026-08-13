"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/shared/inputs";
import { updateAssetMetadataAction, updateAssetPriceAction } from "../actions";
import type { Asset } from "@/types/domain/asset";

/**
 * Edit Asset — metadata, current price, and notes ONLY (point 8). This is a
 * deliberately separate concept from recording a BUY/SELL transaction: it
 * never touches quantity or cost basis.
 */
export function EditAssetDialog({ open, onOpenChange, asset }: { open: boolean; onOpenChange: (o: boolean) => void; asset: Asset }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(asset.name);
  const [exchange, setExchange] = useState(asset.exchange ?? "");
  const [sector, setSector] = useState(asset.sector ?? "");
  const [country, setCountry] = useState(asset.country ?? "");
  const [isin, setIsin] = useState(asset.isin ?? "");
  const [currentPrice, setCurrentPrice] = useState(asset.currentPrice?.toString() ?? "");
  const [notes, setNotes] = useState(asset.notes ?? "");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const metaResult = await updateAssetMetadataAction(asset.id, {
        symbol: asset.symbol,
        name,
        assetType: asset.assetType,
        currency: asset.currency,
        exchange: exchange || null,
        sector: sector || null,
        country: country || null,
        isin: isin || null,
        notes: notes || null,
      });
      if (!metaResult.ok) return setError(metaResult.error);

      if (currentPrice) {
        const priceResult = await updateAssetPriceAction({ assetId: asset.id, currentPrice: Number(currentPrice) });
        if (!priceResult.ok) return setError(priceResult.error);
      }

      toast.success("Asset updated");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {asset.symbol}</DialogTitle>
          <DialogDescription>Metadata, current price, and notes — not a transaction.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-price">Current price</Label>
            <CurrencyInput id="edit-price" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-exchange">Exchange</Label>
              <Input id="edit-exchange" value={exchange} onChange={(e) => setExchange(e.target.value)} placeholder="NSE" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-sector">Sector</Label>
              <Input id="edit-sector" value={sector} onChange={(e) => setSector(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-country">Country</Label>
              <Input id="edit-country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-isin">ISIN</Label>
              <Input id="edit-isin" value={isin} onChange={(e) => setIsin(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-loss">{error}</p>}
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
