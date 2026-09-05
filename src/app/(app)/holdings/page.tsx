import { TopBar } from "@/components/layout/top-bar";
import { portfolioService } from "@/lib/services/portfolio.service";
import { watchlistRepository } from "@/lib/database/repositories/watchlist.repository";
import { HoldingsHubView } from "@/features/holdings/components/holdings-hub-view";

export const dynamic = "force-dynamic";

export default async function HoldingsHubPage() {
  const [allocation, watchlistItems] = await Promise.all([portfolioService.getAssetAllocation(), watchlistRepository.findAll()]);

  return (
    <div>
      <TopBar title="Holdings" subtitle="Everything you own, by category — tap a card to see individual holdings" />
      <HoldingsHubView allocation={allocation} watchlistCount={watchlistItems.length} />
    </div>
  );
}
