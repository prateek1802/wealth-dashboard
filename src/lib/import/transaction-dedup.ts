import type { TransactionType } from "@/constants/asset-types";

/**
 * Dedup key for one imported transaction row, used to make CSV re-import
 * idempotent — same pattern already proven in the NPS statement importer
 * (see buildNPSTransactionDedupKey in calculations/nps.ts and
 * selectTransactionsToImport in import/nps-statement-parser.ts).
 *
 * Deliberately NOT enforced as a DB-level unique constraint the way NPS's
 * dedup key is: NPS scheme transactions only ever enter the DB through
 * statement import (no manual single-entry path exists for them), so a hard
 * uniqueness constraint there is safe. `transactions` has manual entry
 * (Add Transaction / Add Investment) as its PRIMARY path — a user placing
 * two genuinely separate real-world trades that happen to match on every
 * field below is possible and should never be silently rejected. This key
 * is checked only at CSV-import time, against rows already persisted (from
 * any source) plus rows already inserted earlier in the same import run.
 *
 * Includes fees/taxes (unlike the NPS key, which has no equivalent field)
 * since they're present in every import row and identical across a re-
 * upload of the same file — including them narrows what counts as "the same
 * transaction" without weakening idempotency for the actual use case this
 * fixes (re-uploading an unchanged CSV). Deliberately excludes broker/notes:
 * free-text fields are the most likely to carry trivial formatting/encoding
 * differences across "the same" re-upload, which would break the exact
 * de-dup this exists for.
 */
export function buildTransactionDedupKey(
  assetId: string,
  transactionType: TransactionType,
  transactionDate: string,
  quantity: number,
  price: number,
  fees: number,
  taxes: number
): string {
  return `${assetId}|${transactionType}|${transactionDate}|${quantity.toFixed(6)}|${price.toFixed(4)}|${fees.toFixed(4)}|${taxes.toFixed(4)}`;
}
