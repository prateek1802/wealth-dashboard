import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/features/search/command-palette";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { isDemoMode } from "@/lib/database/client";
import { ROUTES } from "@/constants/routes";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const assets = await assetsRepository.findAll();
  const assetEntries = assets.map((a) => ({
    label: `${a.symbol} — ${a.name}`,
    group: "Investments",
    href: ROUTES.investmentDetail(a.id),
  }));

  let userEmail: string | null = null;
  if (!isDemoMode()) {
    const { getServerSupabaseClient } = await import("@/lib/database/server-client");
    const supabase = await getServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar userEmail={userEmail} />
      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
        <main className="flex-1">{children}</main>
      </div>
      <MobileNav userEmail={userEmail} />
      <CommandPalette assetEntries={assetEntries} />
    </div>
  );
}
