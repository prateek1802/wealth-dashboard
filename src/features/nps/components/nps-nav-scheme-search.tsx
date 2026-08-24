"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchNPSNAVSchemesAction } from "../actions";
import { Loader2, Search } from "lucide-react";

export interface NPSNAVSchemeResult {
  schemeCode: string;
  schemeName: string;
}

/**
 * Type-ahead over npsnav.in's scheme index (see
 * lib/market-data/live-provider.ts) — used to CONFIRM which scheme a held
 * E/C/G/A maps to before live NAV refresh is enabled for it. Deliberately
 * requires an explicit pick; never pre-selects or auto-matches (see the
 * comment in live-provider.ts for why).
 */
export function NPSNAVSchemeSearch({ onSelect, onCancel }: { onSelect: (result: NPSNAVSchemeResult) => void; onCancel: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NPSNAVSchemeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const thisRequestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const found = await searchNPSNAVSchemesAction(next);
      if (requestIdRef.current !== thisRequestId) return;
      setResults(found);
      setLoading(false);
    }, 300);
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-border-subtle bg-surface-raised p-2.5">
      <div className="relative">
        <Input
          autoFocus
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search e.g. HDFC Pension Scheme E…"
          className="pr-8 text-xs"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        </span>
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-40 overflow-y-auto">
          {loading && results.length === 0 ? (
            <p className="p-1 text-xs text-ink-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-1 text-xs text-ink-muted">No matches — check spelling or try just the PFM name.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((r) => (
                <li key={r.schemeCode}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full rounded-[var(--radius-control)] px-1.5 py-1 text-left text-xs hover:bg-surface-sunken"
                  >
                    <span className="text-ink">{r.schemeName}</span> <span className="text-ink-muted">({r.schemeCode})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={onCancel} className="self-start text-xs text-ink-muted underline hover:text-ink">
        Cancel
      </button>
    </div>
  );
}
