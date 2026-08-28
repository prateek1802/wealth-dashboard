"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme-provider";
import { isDemoMode, getBrowserSupabaseClient } from "@/lib/database/client";
import { LayoutDashboard, Receipt, LineChart, Target, DatabaseBackup, Wallet, Sun, Moon, Gem, LogOut, Scissors, History } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wallet;
}

const TOP_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.holdings, label: "Holdings", icon: Wallet },
  { href: ROUTES.transactions, label: "Transactions", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
  { href: ROUTES.taxHarvesting, label: "Tax Harvesting", icon: Scissors },
  { href: ROUTES.goals, label: "Goals", icon: Target },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: ROUTES.auditLog, label: "Audit Log", icon: History },
  { href: ROUTES.backup, label: "Backup", icon: DatabaseBackup },
];

function SidebarNav() {
  const pathname = usePathname();

  function isItemActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const NavLink = ({ href, label, icon: Icon }: NavItem) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
        isItemActive(href) ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );

  return (
    <>
      {TOP_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      {BOTTOM_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </>
  );
}

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-surface-raised p-4 lg:flex">
      <Link href={ROUTES.dashboard} className="mb-6 flex items-center gap-2 px-2">
        <Gem className="size-5 text-accent" />
        <span className="font-display text-lg font-medium text-ink">Wealth</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        <SidebarNav />
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
