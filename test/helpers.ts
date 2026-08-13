import type { Transaction } from "@/types/domain/transaction";

let counter = 0;

export function txn(overrides: Partial<Transaction>): Transaction {
  counter += 1;
  return {
    id: `txn-${counter}`,
    assetId: "asset-1",
    transactionType: "BUY",
    quantity: 10,
    price: 100,
    fees: 0,
    taxes: 0,
    transactionDate: "2024-01-01",
    broker: null,
    notes: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}
