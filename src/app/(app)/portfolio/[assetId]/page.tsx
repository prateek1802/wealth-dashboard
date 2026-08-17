import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { transactionsService } from "@/lib/services/transactions.service";
import { portfolioService } from "@/lib/services/portfolio.service";
import { priceHistoryService } from "@/lib/services/price-history.service";
import { InvestmentDetail } from "@/features/portfolio/components/investment-detail";
import { getAssetDisplayLabel } from "@/lib/utils/asset-display";

export const dynamic = "force-dynamic";

export default async function InvestmentDetailPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const holding = await transactionsService.getAssetPosition(assetId);
  if (!holding) notFound();

  const [transactions, priceHistory, allHoldings] = await Promise.all([
    transactionsService.getTransactionHistory(assetId),
    priceHistoryService.getHistory(assetId),
    // getAssetPosition() computes this asset in isolation, so it has no way
    // to know the portfolio total — it always returns 0% (see
    // transactions.service.ts). getHoldings() computes allocation across
    // everything, so we pull the real number from there instead.
    portfolioService.getHoldings(),
  ]);
  const realAllocation = allHoldings.find((h) => h.asset.id === assetId)?.allocationPercent ?? 0;
  const holdingWithAllocation = { ...holding, allocationPercent: realAllocation };

  return (
    <div>
      <TopBar title={getAssetDisplayLabel(holding.asset).primary} subtitle={getAssetDisplayLabel(holding.asset).secondary} />
      <InvestmentDetail holding={holdingWithAllocation} transactions={transactions} priceHistory={priceHistory} />
    </div>
  );
}
