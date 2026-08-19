"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput, DateInput } from "@/components/shared/inputs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SymbolCombobox } from "./symbol-combobox";
import { SECURITY_ASSET_TYPES, ASSET_TYPE_LABELS, TRANSACTION_TYPES } from "@/constants/asset-types";
import { todayISO } from "@/lib/utils/date";
import { addInvestmentAction, addTransactionAction, editTransactionAction } from "../actions";
import type { Asset } from "@/types/domain/asset";
import type { Transaction } from "@/types/domain/transaction";
import type { AssetType, TransactionType } from "@/constants/asset-types";
import type { SymbolSearchResult } from "@/lib/market-data/symbol-search";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog only records a transaction against this existing asset. Otherwise it also collects new-asset metadata (the "Add Investment" flow). */
  asset?: Asset;
  /** When provided (alongside `asset`), edits this transaction instead of creating a new one — asset can't be changed in edit mode. */
  editingTransaction?: Transaction;
}

export function TransactionDialog({ open, onOpenChange, asset, editingTransaction }: TransactionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock_in");
  const [currency, setCurrency] = useState("INR");
  const [exchange, setExchange] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [matchedLive, setMatchedLive] = useState(false);

  const [transactionType, setTransactionType] = useState<TransactionType>(editingTransaction?.transactionType ?? "BUY");
  const [quantity, setQuantity] = useState(editingTransaction?.quantity.toString() ?? "");
  const [price, setPrice] = useState(editingTransaction?.price.toString() ?? "");
  const [fees, setFees] = useState(editingTransaction?.fees.toString() ?? "0");
  const [taxes, setTaxes] = useState(editingTransaction?.taxes.toString() ?? "0");
  const [transactionDate, setTransactionDate] = useState(editingTransaction?.transactionDate ?? todayISO());
  const [broker, setBroker] = useState(editingTransaction?.broker ?? "");

  function handleSelectResult(result: SymbolSearchResult) {
    setSymbol(result.symbol);
    setName(result.name);
    setAssetType(result.assetType);
    setCurrency(result.currency);
    setExchange(result.exchange);
    setCountry(result.country);
    setMatchedLive(true);
  }

  function resetAndClose() {
    setSymbol(""); setName(""); setQuantity(""); setPrice(""); setFees("0"); setTaxes("0"); setBroker("");
    setExchange(null); setCountry(null); setMatchedLive(false);
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const transaction = {
        transactionType,
        quantity: Number(quantity),
        price: Number(price),
        fees: Number(fees || 0),
        taxes: Number(taxes || 0),
        transactionDate,
        broker: broker || null,
        notes: null,
      };

      const result = editingTransaction && asset
        ? await editTransactionAction(editingTransaction.id, asset.id, transaction)
        : asset
          ? await addTransactionAction({ ...transaction, assetId: asset.id })
          : await addInvestmentAction({
              asset: { symbol, name, assetType, currency, exchange, sector: null, country, isin: null, notes: null },
              transaction,
            });

      if (result.ok) {
        toast.success(editingTransaction ? "Transaction updated" : asset ? "Transaction recorded" : "Investment added");
        resetAndClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTransaction ? `Edit transaction — ${asset?.symbol}` : asset ? `Add transaction — ${asset.symbol}` : "Add investment"}</DialogTitle>
          <DialogDescription>
            {editingTransaction ? "Update this BUY or SELL." : asset ? "Record a BUY or SELL for this holding." : "Search for a stock, ETF, or crypto to auto-fill its details — or type a symbol manually (e.g. for mutual funds)."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!asset && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="symbol">Symbol / search</Label>
                <SymbolCombobox
                  symbol={symbol}
                  onSymbolChange={(s) => { setSymbol(s); setMatchedLive(false); }}
                  onSelectResult={handleSelectResult}
                />
                {matchedLive ? (
                  <p className="text-xs text-gain">Matched from live search — Refresh Prices will work for this asset.</p>
                ) : symbol ? (
                  <p className="text-xs text-ink-muted">Manual entry — set the price yourself, or use Edit Asset later. Refresh Prices may not find this symbol.</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assetType">Type</Label>
                  <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                    <SelectTrigger id="assetType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECURITY_ASSET_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{ASSET_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC Bank Ltd" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="txnType">Transaction</Label>
              <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
                <SelectTrigger id="txnType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <DateInput id="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <CurrencyInput id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price per unit</Label>
              <CurrencyInput id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fees">Fees</Label>
              <CurrencyInput id="fees" value={fees} onChange={(e) => setFees(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxes">Taxes</Label>
              <CurrencyInput id="taxes" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broker">Broker (optional)</Label>
            <Input id="broker" value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Zerodha" />
          </div>

          {error && <p className="text-sm text-loss">{error}</p>}

          <Button onClick={handleSubmit} disabled={isPending || !quantity || !price || (!asset && (!symbol || !name))}>
            {isPending ? "Saving…" : asset ? "Add transaction" : "Add investment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
