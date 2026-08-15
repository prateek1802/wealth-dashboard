"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme-provider";
import { isDemoMode, getBrowserSupabaseClient } from "@/lib/database/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ASSET_TYPE_LABELS, type AssetType } from "@/constants/asset-types";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PieChart,
  Bitcoin,
  FileText,
  Receipt,
  LineChart,
  Menu,
  Banknote,
  PiggyBank,
  ShieldCheck,
  Landmark,
  Eye,
  DatabaseBackup,
  Target,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wallet;
}

const MOBILE_TABS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Home", icon: LayoutDashboard },
  { href: ROUTES.transactions, label: "Activity", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
  { href: ROUTES.goals, label: "Goals", icon: Target },
];

const SECURITY_ICONS: Partial<Record<AssetType, typeof Wallet>> = {
  stock_in: TrendingUp,
  stock_us: TrendingUp,
  etf: TrendingUp,
  mutual_fund: PieChart,
  mutual_fund_debt: PieChart,
  crypto: Bitcoin,
  bond: FileText,
  other: FileText,
};
const SECURITY_ORDER: AssetType[] = ["stock_in", "stock_us", "etf", "mutual_fund", "mutual_fund_debt", "crypto", "bond", "other"];

/** Same set as the desktop sidebar's "Holdings" group, plus Backup — reachable via the "More" sheet since there's no room for this many items in the fixed bottom tab bar. */
const OTHER_MORE_ITEMS: NavItem[] = [
  { href: ROUTES.bankAccounts, label: "Bank Accounts", icon: Banknote },
  { href: ROUTES.fixedDeposits, label: "Fixed Deposits", icon: PiggyBank },
  { href: ROUTES.nps, label: "NPS", icon: ShieldCheck },
  { href: ROUTES.ppf, label: "PPF", icon: Landmark },
  { href: ROUTES.watchlist, label: "Watchlist", icon: Eye },
  { href: ROUTES.backup, label: "Backup", icon: DatabaseBackup },
];

/** Needs useSearchParams (for highlighting the active ?type= link), so it gets its own Suspense boundary — same pattern as the desktop sidebar. */
function MoreSheetContent({
  heldAssetTypes,
  userEmail,
  onNavigate,
}: {
  heldAssetTypes: AssetType[];
  userEmail: string | null;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const securityItems: NavItem[] = SECURITY_ORDER.filter((t) => heldAssetTypes.includes(t)).map((t) => ({
    href: `${ROUTES.portfolio}?type=${t}`,
    label: ASSET_TYPE_LABELS[t],
    icon: SECURITY_ICONS[t] ?? Wallet,
  }));
  const items: NavItem[] =
    securityItems.length > 0 ? [...securityItems, ...OTHER_MORE_ITEMS] : [{ href: ROUTES.portfolio, label: "Portfolio", icon: Wallet }, ...OTHER_MORE_ITEMS];

  function isItemActive(href: string): boolean {
    if (href.includes("?type=")) {
      const [path, query] = href.split("?type=");
      return pathname === path && currentType === query;
    }
    if (href === ROUTES.portfolio) return pathname === ROUTES.portfolio && !currentType;
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
      {items.map((item) => (
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

export function MobileNav({ userEmail, heldAssetTypes }: { userEmail: string | null; heldAssetTypes: AssetType[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = pathname === ROUTES.portfolio || OTHER_MORE_ITEMS.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

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
            <MoreSheetContent heldAssetTypes={heldAssetTypes} userEmail={userEmail} onNavigate={() => setMoreOpen(false)} />
          </Suspense>
        </DialogContent>
      </Dialog>
    </>
  );
}
