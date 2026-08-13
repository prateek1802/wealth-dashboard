"use client";
import { Search } from "lucide-react";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle bg-surface px-4 py-4 lg:px-8">
      <div className="flex flex-col">
        <h1 className="font-display text-xl font-medium text-ink md:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
      </div>
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-sunken"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
    </div>
  );
}
