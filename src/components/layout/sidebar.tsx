"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme-provider";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  LineChart,
  Target,
  Banknote,
  PiggyBank,
  ShieldCheck,
  Landmark,
  Eye,
  DatabaseBackup,
  Sun,
  Moon,
  Gem,
} from "lucide-react";

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.portfolio, label: "Portfolio", icon: Wallet },
  { href: ROUTES.transactions, label: "Transactions", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
  { href: ROUTES.goals, label: "Goals", icon: Target },
  { href: ROUTES.bankAccounts, label: "Bank Accounts", icon: Banknote },
  { href: ROUTES.fixedDeposits, label: "Fixed Deposits", icon: PiggyBank },
  { href: ROUTES.nps, label: "NPS", icon: ShieldCheck },
  { href: ROUTES.ppf, label: "PPF", icon: Landmark },
  { href: ROUTES.watchlist, label: "Watchlist", icon: Eye },
  { href: ROUTES.backup, label: "Backup", icon: DatabaseBackup },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border-subtle bg-surface-raised p-4 lg:flex">
      <Link href={ROUTES.dashboard} className="mb-6 flex items-center gap-2 px-2">
        <Gem className="size-5 text-accent" />
        <span className="font-display text-lg font-medium text-ink">Wealth</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>
    </aside>
  );
}
