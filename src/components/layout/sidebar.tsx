"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme-provider";
import { isDemoMode, getBrowserSupabaseClient } from "@/lib/database/client";
import {
  LayoutDashboard,
  Receipt,
  LineChart,
  Target,
  DatabaseBackup,
  Wallet,
  Banknote,
  PiggyBank,
  ShieldCheck,
  Landmark,
  Eye,
  Sun,
  Moon,
  Gem,
  LogOut,
  ChevronDown,
} from "lucide-react";

const TOP_ITEMS = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.transactions, label: "Transactions", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
  { href: ROUTES.goals, label: "Goals", icon: Target },
];

/** Everything that represents something you hold — securities live inside Portfolio itself, grouped by asset class; the rest are their own asset classes with dedicated pages. */
const HOLDINGS_ITEMS = [
  { href: ROUTES.portfolio, label: "Stocks & Funds", icon: Wallet },
  { href: ROUTES.bankAccounts, label: "Bank Accounts", icon: Banknote },
  { href: ROUTES.fixedDeposits, label: "Fixed Deposits", icon: PiggyBank },
  { href: ROUTES.nps, label: "NPS", icon: ShieldCheck },
  { href: ROUTES.ppf, label: "PPF", icon: Landmark },
  { href: ROUTES.watchlist, label: "Watchlist", icon: Eye },
];

const BOTTOM_ITEMS = [{ href: ROUTES.backup, label: "Backup", icon: DatabaseBackup }];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const holdingsActive = HOLDINGS_ITEMS.some((item) => isActive(pathname, item.href));
  const [holdingsOpen, setHoldingsOpen] = useState(holdingsActive);

  async function handleSignOut() {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLink = ({ href, label, icon: Icon, indent = false }: { href: string; label: string; icon: typeof Wallet; indent?: boolean }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
        indent && "ml-3",
        isActive(pathname, href) ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-surface-raised p-4 lg:flex">
      <Link href={ROUTES.dashboard} className="mb-6 flex items-center gap-2 px-2">
        <Gem className="size-5 text-accent" />
        <span className="font-display text-lg font-medium text-ink">Wealth</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {TOP_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <button
          onClick={() => setHoldingsOpen((o) => !o)}
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
            holdingsActive && !holdingsOpen ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
          )}
        >
          <Wallet className="size-4" />
          Holdings
          <ChevronDown className={cn("ml-auto size-3.5 transition-transform", holdingsOpen && "rotate-180")} />
        </button>
        {holdingsOpen && (
          <div className="flex flex-col gap-1">
            {HOLDINGS_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} indent />
            ))}
          </div>
        )}

        {BOTTOM_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>

      {!isDemoMode() && (
        <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
            {userEmail ? userEmail[0].toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{userEmail ?? "Signed in"}</p>
          </div>
          <button onClick={handleSignOut} title="Sign out" className="shrink-0 rounded-[var(--radius-control)] p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-loss">
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
