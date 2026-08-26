import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/currency";
import { ROUTES } from "@/constants/routes";
import { ALLOCATION_CATEGORY_LABELS, type AllocationCategory, type AssetType } from "@/constants/asset-types";
import { TrendingUp, PieChart, Bitcoin, FileText, Banknote, PiggyBank, ShieldCheck, Landmark, AlertTriangle, Eye, type LucideIcon } from "lucide-react";
import type { AllocationSlice } from "@/types/domain/snapshot";

const CATEGORY_ICONS: Record<AllocationCategory, LucideIcon> = {
  stock_in: TrendingUp,
  stock_us: TrendingUp,
  etf: TrendingUp,
  mutual_fund: PieChart,
  mutual_fund_debt: PieChart,
  crypto: Bitcoin,
  bond: FileText,
  other: FileText,
  cash: Banknote,
  fixed_deposit: PiggyBank,
  nps: ShieldCheck,
  ppf: Landmark,
};

const SECURITY_TYPES: ReadonlySet<AssetType> = new Set(["stock_in", "stock_us", "etf", "mutual_fund", "mutual_fund_debt", "crypto", "bond", "other"]);

function categoryRoute(category: AllocationCategory): string {
  if (SECURITY_TYPES.has(category as AssetType)) return `${ROUTES.portfolio}?type=${category}`;
  if (category === "cash") return ROUTES.bankAccounts;
  if (category === "fixed_deposit") return ROUTES.fixedDeposits;
  if (category === "nps") return ROUTES.nps;
  return ROUTES.ppf; // category === "ppf"
}

function HoldingCard({ href, icon: Icon, label, valueLabel, tone = "default" }: { href: string; icon: LucideIcon; label: string; valueLabel: string; tone?: "default" | "loss" }) {
  return (
    <Link href={href}>
      <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
        <div className={tone === "loss" ? "flex size-9 items-center justify-center rounded-full bg-loss-soft text-loss" : "flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent"}>
          <Icon className="size-4.5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-ink-muted">{label}</span>
          <span className={tone === "loss" ? "font-tabular text-lg font-medium text-loss" : "font-tabular text-lg font-medium text-ink"}>{valueLabel}</span>
        </div>
      </Card>
    </Link>
  );
}

export function HoldingsHubView({ allocation, liabilitiesValue, watchlistCount }: { allocation: AllocationSlice[]; liabilitiesValue: number; watchlistCount: number }) {
  const sorted = [...allocation].sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:p-6 lg:grid-cols-4">
      {sorted.map((slice) => (
        <HoldingCard
          key={slice.category}
          href={categoryRoute(slice.category)}
          icon={CATEGORY_ICONS[slice.category]}
          label={ALLOCATION_CATEGORY_LABELS[slice.category]}
          valueLabel={formatCurrency(slice.value)}
        />
      ))}

      {liabilitiesValue > 0 && (
        <HoldingCard href={ROUTES.liabilities} icon={AlertTriangle} label="Liabilities" valueLabel={formatSignedCurrency(-liabilitiesValue)} tone="loss" />
      )}

      <HoldingCard href={ROUTES.watchlist} icon={Eye} label="Watchlist" valueLabel={`${watchlistCount} tracked`} />
    </div>
  );
}
