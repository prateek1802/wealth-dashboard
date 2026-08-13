"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ROUTES } from "@/constants/routes";
import { LayoutDashboard, Wallet, Receipt, LineChart, Target, Banknote, PiggyBank, ShieldCheck, Landmark, Eye, DatabaseBackup } from "lucide-react";

interface SearchEntry {
  label: string;
  group: string;
  href: string;
}

const STATIC_ENTRIES: SearchEntry[] = [
  { label: "Dashboard", group: "Pages", href: ROUTES.dashboard },
  { label: "Portfolio", group: "Pages", href: ROUTES.portfolio },
  { label: "Transactions", group: "Pages", href: ROUTES.transactions },
  { label: "Analytics", group: "Pages", href: ROUTES.analytics },
  { label: "Goals", group: "Pages", href: ROUTES.goals },
  { label: "Bank Accounts", group: "Pages", href: ROUTES.bankAccounts },
  { label: "Fixed Deposits", group: "Pages", href: ROUTES.fixedDeposits },
  { label: "NPS", group: "Pages", href: ROUTES.nps },
  { label: "PPF", group: "Pages", href: ROUTES.ppf },
  { label: "Watchlist", group: "Pages", href: ROUTES.watchlist },
  { label: "Backup", group: "Pages", href: ROUTES.backup },
];

const ICONS: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Portfolio: Wallet,
  Transactions: Receipt,
  Analytics: LineChart,
  Goals: Target,
  "Bank Accounts": Banknote,
  "Fixed Deposits": PiggyBank,
  NPS: ShieldCheck,
  PPF: Landmark,
  Watchlist: Eye,
  Backup: DatabaseBackup,
};

export function CommandPalette({ assetEntries }: { assetEntries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const entries = useMemo(() => [...STATIC_ENTRIES, ...assetEntries], [assetEntries]);
  const groups = useMemo(() => {
    const map = new Map<string, SearchEntry[]>();
    for (const entry of entries) {
      if (!map.has(entry.group)) map.set(entry.group, []);
      map.get(entry.group)!.push(entry);
    }
    return map;
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 top-[20%] translate-y-0">
        <Command className="flex flex-col overflow-hidden rounded-[var(--radius-card)]">
          <Command.Input
            placeholder="Search investments, transactions, goals…"
            className="w-full border-b border-border-subtle bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-sm text-ink-muted">No results found.</Command.Empty>
            {Array.from(groups.entries()).map(([group, items]) => (
              <Command.Group key={group} heading={group} className="px-2 py-1 text-xs font-medium text-ink-muted">
                {items.map((item) => {
                  const Icon = ICONS[item.label] ?? LayoutDashboard;
                  return (
                    <Command.Item
                      key={item.href + item.label}
                      onSelect={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className="flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 text-sm text-ink data-[selected=true]:bg-surface-sunken"
                    >
                      <Icon className="size-4 text-ink-muted" />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
