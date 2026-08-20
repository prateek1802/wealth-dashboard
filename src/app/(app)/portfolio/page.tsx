import { TopBar } from "@/components/layout/top-bar";
import { portfolioService } from "@/lib/services/portfolio.service";
import { PortfolioView } from "@/features/portfolio/components/portfolio-view";
import { ASSET_TYPE_LABELS, type AssetType } from "@/constants/asset-types";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const allHoldings = await portfolioService.getHoldingsWithXIRR();
  const holdings = type ? allHoldings.filter((h) => h.asset.assetType === type) : allHoldings;
  const title = type ? ASSET_TYPE_LABELS[type as AssetType] ?? "Portfolio" : "Portfolio";

  return (
    <div>
      <TopBar title={title} subtitle={`${holdings.length} holding${holdings.length === 1 ? "" : "s"}`} />
      <PortfolioView holdings={holdings} flatten={!!type} />
    </div>
  );
}
