import { z } from "zod";
import { ASSET_TYPES, TRANSACTION_TYPES } from "@/constants/asset-types";
import { normalizeDateString } from "@/lib/utils/date-normalize";

/**
 * One row of a transactions CSV import. Column headers are matched
 * case-insensitively and with underscores/spaces normalized — see
 * lib/utils/csv-import.ts normalizeHeader(). Required: date, symbol, name,
 * assetType, type, quantity, price. Everything else defaults sensibly.
 *
 * `date` is transformed through normalizeDateString() here, not just
 * loosely validated — see that function's comment for why: the previous
 * Date.parse()-based check accepted formats (like "15-04-2023") that
 * date-fns' strict parseISO() couldn't read later, which crashed the
 * Transactions page the moment that row was displayed.
 */
export const transactionImportRowSchema = z.object({
  date: z.string().transform((v, ctx) => {
    const normalized = normalizeDateString(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: `Unrecognized date format: "${v}" — use YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY` });
      return z.NEVER;
    }
    return normalized;
  }),
  symbol: z.string().trim().min(1, "Symbol is required"),
  name: z.string().trim().min(1, "Name is required"),
  assetType: z.enum(ASSET_TYPES, { message: `assetType must be one of: ${ASSET_TYPES.join(", ")}` }),
  type: z.enum(TRANSACTION_TYPES, { message: "type must be BUY or SELL" }),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  price: z.coerce.number().nonnegative("Price cannot be negative"),
  fees: z.coerce.number().nonnegative().default(0),
  taxes: z.coerce.number().nonnegative().default(0),
  currency: z.string().trim().length(3).default("INR"),
  exchange: z.string().trim().nullable().default(null),
  broker: z.string().trim().nullable().default(null),
  notes: z.string().trim().nullable().default(null),
});

export type TransactionImportRow = z.infer<typeof transactionImportRowSchema>;

export interface TransactionImportRowResult {
  rowNumber: number; // 1-based, matches spreadsheet row (header = row 1)
  ok: boolean;
  error?: string;
  symbol?: string;
}

export interface TransactionImportSummary {
  totalRows: number;
  imported: number;
  failed: TransactionImportRowResult[];
}
