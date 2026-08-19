import { isDemoMode } from "@/lib/database/client";
import { getServerSupabaseClient } from "@/lib/database/server-client";
import { demoTransactions, nextId } from "@/lib/database/demo-data";
import type { Transaction, NewTransaction } from "@/types/domain/transaction";
import type { TransactionRow } from "@/types/database";
import type { TransactionType } from "@/constants/asset-types";

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    assetId: row.asset_id,
    transactionType: row.transaction_type as TransactionType,
    quantity: row.quantity,
    price: row.price,
    fees: row.fees,
    taxes: row.taxes,
    transactionDate: row.transaction_date,
    broker: row.broker,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const transactionsRepository = {
  async findAll(): Promise<Transaction[]> {
    if (isDemoMode()) {
      return [...demoTransactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db.from("transactions").select("*").order("transaction_date", { ascending: false });
    if (error) throw error;
    return (data as TransactionRow[]).map(rowToTransaction);
  },

  async findByAssetId(assetId: string): Promise<Transaction[]> {
    if (isDemoMode()) {
      return demoTransactions
        .filter((t) => t.assetId === assetId)
        .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("transactions")
      .select("*")
      .eq("asset_id", assetId)
      .order("transaction_date");
    if (error) throw error;
    return (data as TransactionRow[]).map(rowToTransaction);
  },

  async findRecent(limit: number): Promise<Transaction[]> {
    const all = await this.findAll();
    return all.slice(0, limit);
  },

  async create(input: NewTransaction): Promise<Transaction> {
    if (isDemoMode()) {
      const txn: Transaction = { ...input, id: nextId("txn"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      demoTransactions.push(txn);
      return txn;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("transactions")
      .insert({
        asset_id: input.assetId,
        transaction_type: input.transactionType,
        quantity: input.quantity,
        price: input.price,
        fees: input.fees,
        taxes: input.taxes,
        transaction_date: input.transactionDate,
        broker: input.broker,
        notes: input.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToTransaction(data as TransactionRow);
  },

  /** Edits the transaction's own fields — never the assetId; changing which asset a transaction belongs to isn't supported (delete + re-add instead). */
  async update(id: string, input: Omit<NewTransaction, "assetId">): Promise<Transaction> {
    if (isDemoMode()) {
      const txn = demoTransactions.find((t) => t.id === id);
      if (!txn) throw new Error("Transaction not found");
      Object.assign(txn, input, { updatedAt: new Date().toISOString() });
      return txn;
    }
    const db = await getServerSupabaseClient();
    const { data, error } = await db
      .from("transactions")
      .update({
        transaction_type: input.transactionType,
        quantity: input.quantity,
        price: input.price,
        fees: input.fees,
        taxes: input.taxes,
        transaction_date: input.transactionDate,
        broker: input.broker,
        notes: input.notes,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToTransaction(data as TransactionRow);
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      const idx = demoTransactions.findIndex((t) => t.id === id);
      if (idx >= 0) demoTransactions.splice(idx, 1);
      return;
    }
    const db = await getServerSupabaseClient();
    const { error } = await db.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },
};
