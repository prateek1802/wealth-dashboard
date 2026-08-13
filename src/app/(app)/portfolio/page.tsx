import { TopBar } from "@/components/layout/top-bar";
import { portfolioService } from "@/lib/services/portfolio.service";
import { PortfolioView } from "@/features/portfolio/components/portfolio-view";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const holdings = await portfolioService.getHoldings();
  return (
    <div>
      <TopBar title="Portfolio" subtitle={`${holdings.length} holding${holdings.length === 1 ? "" : "s"}`} />
      <PortfolioView holdings={holdings} />
    </div>
  );
}
