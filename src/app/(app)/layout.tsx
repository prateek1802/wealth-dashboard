import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/features/search/command-palette";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { ROUTES } from "@/constants/routes";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const assets = await assetsRepository.findAll();
  const assetEntries = assets.map((a) => ({
    label: `${a.symbol} — ${a.name}`,
    group: "Investments",
    href: ROUTES.investmentDetail(a.id),
  }));

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
        <main className="flex-1">{children}</main>
      </div>
      <MobileNav />
      <CommandPalette assetEntries={assetEntries} />
    </div>
  );
}
