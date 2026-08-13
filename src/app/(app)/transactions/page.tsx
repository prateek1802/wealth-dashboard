import { TopBar } from "@/components/layout/top-bar";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { TransactionsView } from "@/features/transactions/components/transactions-view";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [transactions, assets] = await Promise.all([transactionsRepository.findAll(), assetsRepository.findAll()]);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const rows = transactions.map((t) => ({ ...t, asset: assetById.get(t.assetId) }));

  return (
    <div>
      <TopBar title="Transactions" subtitle="The source of truth for every holding" />
      <TransactionsView rows={rows} />
    </div>
  );
}
