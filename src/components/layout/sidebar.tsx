"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme-provider";
import { isDemoMode, getBrowserSupabaseClient } from "@/lib/database/client";
import { ASSET_TYPE_LABELS, type AssetType } from "@/constants/asset-types";
import {
  LayoutDashboard,
  Receipt,
  LineChart,
  Target,
  DatabaseBackup,
  Wallet,
  TrendingUp,
  PieChart,
  Bitcoin,
  FileText,
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

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wallet;
}

const TOP_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.transactions, label: "Transactions", icon: Receipt },
  { href: ROUTES.analytics, label: "Analytics", icon: LineChart },
  { href: ROUTES.goals, label: "Goals", icon: Target },
];

/** One icon per security asset class — used for the dynamic per-class Holdings links. */
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

/** Non-security asset classes always get their own dedicated page — they never share a route with anything else, unlike securities which all live under /portfolio filtered by ?type=. */
const OTHER_HOLDINGS_ITEMS: NavItem[] = [
  { href: ROUTES.bankAccounts, label: "Bank Accounts", icon: Banknote },
  { href: ROUTES.fixedDeposits, label: "Fixed Deposits", icon: PiggyBank },
  { href: ROUTES.nps, label: "NPS", icon: ShieldCheck },
  { href: ROUTES.ppf, label: "PPF", icon: Landmark },
  { href: ROUTES.watchlist, label: "Watchlist", icon: Eye },
];

const BOTTOM_ITEMS: NavItem[] = [{ href: ROUTES.backup, label: "Backup", icon: DatabaseBackup }];

/**
 * Reads pathname + the ?type= query param, so it needs its own Suspense
 * boundary (useSearchParams requirement) — kept as a small child component
 * rather than making the whole Sidebar suspend, so the logo/theme
 * toggle/profile block never flash a fallback state.
 */
function SidebarNav({ heldAssetTypes }: { heldAssetTypes: AssetType[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  const securityItems: NavItem[] = SECURITY_ORDER.filter((t) => heldAssetTypes.includes(t)).map((t) => ({
    href: `${ROUTES.portfolio}?type=${t}`,
    label: ASSET_TYPE_LABELS[t],
    icon: SECURITY_ICONS[t] ?? Wallet,
  }));
  const holdingsItems: NavItem[] =
    securityItems.length > 0 ? [...securityItems, ...OTHER_HOLDINGS_ITEMS] : [{ href: ROUTES.portfolio, label: "Portfolio", icon: Wallet }, ...OTHER_HOLDINGS_ITEMS];

  function isItemActive(href: string): boolean {
    if (href.includes("?type=")) {
      const [path, query] = href.split("?type=");
      return pathname === path && currentType === query;
    }
    if (href === ROUTES.portfolio) {
      return pathname === ROUTES.portfolio && !currentType;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  const holdingsActive = holdingsItems.some((item) => isItemActive(item.href));
  const [holdingsOpen, setHoldingsOpen] = useState(holdingsActive);

  const NavLink = ({ href, label, icon: Icon, indent = false }: NavItem & { indent?: boolean }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
        indent && "ml-3",
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
          {holdingsItems.map((item) => (
            <NavLink key={item.href} {...item} indent />
          ))}
        </div>
      )}

      {BOTTOM_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </>
  );
}

export function Sidebar({ userEmail, heldAssetTypes }: { userEmail: string | null; heldAssetTypes: AssetType[] }) {
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
        <Suspense fallback={null}>
          <SidebarNav heldAssetTypes={heldAssetTypes} />
        </Suspense>
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
