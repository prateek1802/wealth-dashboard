"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchSymbolsAction } from "../actions";
import { ASSET_TYPE_LABELS } from "@/constants/asset-types";
import { Loader2, Search } from "lucide-react";
import type { SymbolSearchResult } from "@/lib/market-data/symbol-search";

interface SymbolComboboxProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  onSelectResult: (result: SymbolSearchResult) => void;
}

/**
 * Type-ahead over live symbol search (Yahoo Finance for stocks/ETFs,
 * mfapi.in for Indian mutual funds, CoinGecko for crypto — see
 * lib/market-data/symbol-search.ts) so you pick the exact tradeable
 * symbol/scheme Refresh Prices can look up, instead of typing a free-text
 * name it can't match.
 */
export function SymbolCombobox({ symbol, onSymbolChange, onSelectResult }: SymbolComboboxProps) {
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against out-of-order responses: if you type fast, an earlier
  // (slower) request's results shouldn't overwrite a later one's — this is
  // what caused stale/duplicate-looking rows to flash in.
  const requestIdRef = useRef(0);

  function handleChange(next: string) {
    onSymbolChange(next.toUpperCase());
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      requestIdRef.current += 1; // invalidate any in-flight request
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const thisRequestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const found = await searchSymbolsAction(next);
      if (requestIdRef.current !== thisRequestId) return; // a newer keystroke already superseded this
      setResults(found);
      setLoading(false);
    }, 300);
  }

  function handleSelect(result: SymbolSearchResult) {
    setOpen(false);
    setResults([]);
    onSelectResult(result);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={symbol}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search HDFC Bank, Bitcoin, TCS…"
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </span>
      </div>

      {open && symbol.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-control)] border border-border-subtle bg-surface-raised shadow-lg">
          {loading && results.length === 0 ? (
            <p className="flex items-center gap-2 p-3 text-xs text-ink-muted">
              <Loader2 className="size-3.5 animate-spin" /> Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-ink-muted">
              No live matches — you can still type a symbol manually.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={`${r.symbol}-${r.assetType}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-sunken"
                  >
                    <span className="flex flex-col">
                      <span className="font-mono font-medium text-ink">{r.symbol}</span>
                      <span className="text-xs text-ink-muted">{r.name}</span>
                    </span>
                    <Badge>{ASSET_TYPE_LABELS[r.assetType]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
