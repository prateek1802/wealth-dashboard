import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { transactionsRepository } from "@/lib/database/repositories/transactions.repository";
import { summarizeAssetPosition } from "@/lib/calculations/pnl";
import type { NewTransaction, Transaction } from "@/types/domain/transaction";
import type { Holding } from "@/types/domain/holding";
import type { NewAsset } from "@/types/domain/asset";

export const transactionsService = {
  /**
   * Records a transaction, creating the asset first if it doesn't exist yet
   * (find-or-create by symbol+type). This is the "Add Investment" flow.
   */
  async recordTransaction(assetInput: NewAsset, txnInput: Omit<NewTransaction, "assetId">): Promise<Transaction> {
    const asset = await assetsRepository.upsertBySymbol(assetInput);
    if (txnInput.transactionType === "SELL") {
      const existing = await transactionsRepository.findByAssetId(asset.id);
      const heldQty = existing.reduce((q, t) => (t.transactionType === "BUY" ? q + t.quantity : q - t.quantity), 0);
      if (txnInput.quantity > heldQty + 1e-9) {
        throw new Error(`Cannot sell ${txnInput.quantity} units — only ${heldQty} held.`);
      }
    }
    return transactionsRepository.create({ ...txnInput, assetId: asset.id });
  },

  async deleteTransaction(id: string): Promise<void> {
    return transactionsRepository.delete(id);
  },

  /** Full position summary for a single asset's detail page. */
  async getAssetPosition(assetId: string): Promise<Holding | null> {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) return null;
    const transactions = await transactionsRepository.findByAssetId(assetId);
    const position = summarizeAssetPosition(transactions, asset.currentPrice);
    return {
      asset,
      quantity: position.quantity,
      weightedAverageCost: position.weightedAverageCost,
      investedAmount: position.investedAmount,
      currentValue: position.currentValue,
      unrealizedPnl: position.unrealizedPnl,
      unrealizedPnlPercent: position.unrealizedPnlPercent,
      realizedPnl: position.realizedPnl,
      allocationPercent: 0, // filled in by portfolio.service when part of an aggregate view
    };
  },

  async getTransactionHistory(assetId: string): Promise<Transaction[]> {
    return transactionsRepository.findByAssetId(assetId);
  },
};
