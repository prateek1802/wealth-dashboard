"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme-provider";
import { isDemoMode, getBrowserSupabaseClient } from "@/lib/database/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  LineChart,
  Menu,
  Eye,
  DatabaseBackup,
  Target,
  Sun,
  Moon,
  LogOut,
  Scissors,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wallet;
}

const MOBILE_TABS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Home", icon: LayoutDashboard },
  { href: ROUTES.holdings, label: "Holdings", icon: Wallet },
  { href: ROUTES.transactions, label: "Activity", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
];

/** Everything that doesn't fit in the fixed 4-slot bottom tab bar, reachable via "More". Per-asset-class links now live one level deeper, inside the Holdings hub (see /holdings) — not duplicated here. */
const MORE_ITEMS: NavItem[] = [
  { href: ROUTES.goals, label: "Goals", icon: Target },
  { href: ROUTES.watchlist, label: "Watchlist", icon: Eye },
  { href: ROUTES.taxHarvesting, label: "Tax Harvesting", icon: Scissors },
  { href: ROUTES.backup, label: "Backup", icon: DatabaseBackup },
];

function MoreSheetContent({ userEmail, onNavigate }: { userEmail: string | null; onNavigate: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  function isItemActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      {MORE_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium",
            isItemActive(item.href) ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}

      <button
        onClick={toggleTheme}
        className="mt-2 flex items-center gap-3 rounded-[var(--radius-control)] border-t border-border-subtle px-3 pt-4 pb-2.5 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>

      {!isDemoMode() && (
        <div className="mt-1 flex items-center gap-2 px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
            {userEmail ? userEmail[0].toUpperCase() : "?"}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">{userEmail ?? "Signed in"}</p>
          <button onClick={handleSignOut} title="Sign out" className="shrink-0 rounded-[var(--radius-control)] p-1.5 text-ink-muted hover:text-loss">
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function MobileNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border-subtle bg-surface-raised lg:hidden">
        {MOBILE_TABS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-accent" : "text-ink-muted")}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", moreActive ? "text-accent" : "text-ink-muted")}
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <Suspense fallback={null}>
            <MoreSheetContent userEmail={userEmail} onNavigate={() => setMoreOpen(false)} />
          </Suspense>
        </DialogContent>
      </Dialog>
    </>
  );
}
