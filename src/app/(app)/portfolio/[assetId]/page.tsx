import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { transactionsService } from "@/lib/services/transactions.service";
import { priceHistoryService } from "@/lib/services/price-history.service";
import { InvestmentDetail } from "@/features/portfolio/components/investment-detail";

export const dynamic = "force-dynamic";

export default async function InvestmentDetailPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const holding = await transactionsService.getAssetPosition(assetId);
  if (!holding) notFound();

  const [transactions, priceHistory] = await Promise.all([
    transactionsService.getTransactionHistory(assetId),
    priceHistoryService.getHistory(assetId),
  ]);

  return (
    <div>
      <TopBar title={holding.asset.symbol} subtitle={holding.asset.name} />
      <InvestmentDetail holding={holding} transactions={transactions} priceHistory={priceHistory} />
    </div>
  );
}
