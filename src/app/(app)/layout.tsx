import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/features/search/command-palette";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { portfolioService } from "@/lib/services/portfolio.service";
import { isDemoMode } from "@/lib/database/client";
import { ROUTES } from "@/constants/routes";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [assets, holdings] = await Promise.all([assetsRepository.findAll(), portfolioService.getHoldings()]);
  const assetEntries = assets.map((a) => ({
    label: `${a.symbol} — ${a.name}`,
    group: "Investments",
    href: ROUTES.investmentDetail(a.id),
  }));
  // Distinct asset classes actually held — drives one sidebar link per
  // class instead of a single combined "Portfolio" link, and skips
  // classes you don't hold anything in (no dead links).
  const heldAssetTypes = Array.from(new Set(holdings.map((h) => h.asset.assetType)));

  let userEmail: string | null = null;
  if (!isDemoMode()) {
    const { getServerSupabaseClient } = await import("@/lib/database/server-client");
    const supabase = await getServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar userEmail={userEmail} heldAssetTypes={heldAssetTypes} />
      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
        <main className="flex-1">{children}</main>
      </div>
      <MobileNav userEmail={userEmail} heldAssetTypes={heldAssetTypes} />
      <CommandPalette assetEntries={assetEntries} />
    </div>
  );
}
