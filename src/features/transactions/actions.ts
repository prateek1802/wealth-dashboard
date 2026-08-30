"use server";
import { revalidatePath } from "next/cache";
import { transactionsService } from "@/lib/services/transactions.service";
import { assetsRepository } from "@/lib/database/repositories/assets.repository";
import { transactionSchema } from "@/lib/validation/transaction.schema";
import { assetSchema } from "@/lib/validation/asset.schema";
import { ROUTES } from "@/constants/routes";
import { logServerError } from "@/lib/utils/log-error";
import { z } from "zod";

const addInvestmentSchema = z.object({
  asset: assetSchema,
  transaction: transactionSchema.omit({ assetId: true }),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addInvestmentAction(input: unknown): Promise<ActionResult> {
  const parsed = addInvestmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await transactionsService.recordTransaction(
      { ...parsed.data.asset, currentPrice: null, currentPriceUpdatedAt: null, isActive: true },
      parsed.data.transaction
    );
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.transactions);
    return { ok: true };
  } catch (err) {
    logServerError("addInvestmentAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

const addTransactionSchema = transactionSchema;

export async function addTransactionAction(input: unknown): Promise<ActionResult> {
  const parsed = addTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const asset = await assetsRepository.findById(parsed.data.assetId);
    if (!asset) return { ok: false, error: "Asset not found" };
    await transactionsService.recordTransaction(
      { symbol: asset.symbol, name: asset.name, assetType: asset.assetType, currency: asset.currency, exchange: asset.exchange, sector: asset.sector, country: asset.country, isin: asset.isin, currentPrice: asset.currentPrice, currentPriceUpdatedAt: asset.currentPriceUpdatedAt, isActive: asset.isActive, notes: asset.notes },
      parsed.data
    );
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.transactions);
    revalidatePath(ROUTES.investmentDetail(parsed.data.assetId));
    return { ok: true };
  } catch (err) {
    logServerError("addTransactionAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function editTransactionAction(id: string, assetId: string, input: unknown): Promise<ActionResult> {
  const parsed = transactionSchema.omit({ assetId: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await transactionsService.editTransaction(id, assetId, parsed.data);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.transactions);
    revalidatePath(ROUTES.investmentDetail(assetId));
    return { ok: true };
  } catch (err) {
    logServerError("editTransactionAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function deleteTransactionAction(id: string, assetId: string): Promise<ActionResult> {
  try {
    await transactionsService.deleteTransaction(id);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.transactions);
    revalidatePath(ROUTES.investmentDetail(assetId));
    return { ok: true };
  } catch (err) {
    logServerError("deleteTransactionAction", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

export async function searchSymbolsAction(query: string) {
  const { searchSymbols } = await import("@/lib/market-data/symbol-search");
  return searchSymbols(query);
}

export async function importTransactionsCSVAction(
  rawRows: Record<string, string>[]
): Promise<{ ok: true; summary: import("@/lib/validation/transaction-import.schema").TransactionImportSummary } | { ok: false; error: string }> {
  const { transactionImportRowSchema } = await import("@/lib/validation/transaction-import.schema");
  const { assetsRepository: assetsRepo } = await import("@/lib/database/repositories/assets.repository");
  const { transactionsRepository } = await import("@/lib/database/repositories/transactions.repository");
  const { buildTransactionDedupKey } = await import("@/lib/import/transaction-dedup");

  if (rawRows.length === 0) {
    return { ok: false, error: "No rows found in the file — check it has a header row and at least one data row." };
  }
  if (rawRows.length > 5000) {
    return { ok: false, error: "That's more than 5000 rows in one file — split it up and import in batches." };
  }

  // Parse + validate every row first (fail fast per-row, but don't insert anything for a row that fails).
  const parsedRows: { rowNumber: number; data: import("@/lib/validation/transaction-import.schema").TransactionImportRow | null; error?: string }[] = [];
  rawRows.forEach((row, i) => {
    const result = transactionImportRowSchema.safeParse(row);
    if (result.success) {
      parsedRows.push({ rowNumber: i + 2, data: result.data }); // +2: 1-based, plus header row
    } else {
      parsedRows.push({ rowNumber: i + 2, data: null, error: result.error.issues[0]?.message ?? "Invalid row" });
    }
  });

  // Insert valid rows in DATE order — SELL validation checks quantity held
  // so far, which only makes sense processed chronologically, regardless
  // of the order rows appeared in the file.
  const valid = parsedRows.filter((r) => r.data !== null) as { rowNumber: number; data: import("@/lib/validation/transaction-import.schema").TransactionImportRow }[];
  valid.sort((a, b) => a.data.date.localeCompare(b.data.date));

  const failed: import("@/lib/validation/transaction-import.schema").TransactionImportRowResult[] = parsedRows
    .filter((r) => r.data === null)
    .map((r) => ({ rowNumber: r.rowNumber, ok: false, error: r.error }));

  // Dedup — see buildTransactionDedupKey()'s doc comment for why this
  // exists and isn't a DB-level constraint. Seeded from every transaction
  // already persisted (any source, not just prior imports), then grown as
  // rows are inserted below so within-file duplicates are caught too, not
  // just duplicates against a previous import.
  const existingTransactions = await transactionsRepository.findAll();
  const seenKeys = new Set(
    existingTransactions.map((t) => buildTransactionDedupKey(t.assetId, t.transactionType, t.transactionDate, t.quantity, t.price, t.fees, t.taxes))
  );

  let imported = 0;
  let duplicates = 0;
  for (const { rowNumber, data } of valid) {
    try {
      const asset = await assetsRepo.upsertBySymbol({
        symbol: data.symbol,
        name: data.name,
        assetType: data.assetType,
        currency: data.currency,
        exchange: data.exchange,
        sector: null,
        country: null,
        isin: null,
        currentPrice: null,
        currentPriceUpdatedAt: null,
        isActive: true,
        notes: null,
      });

      const key = buildTransactionDedupKey(asset.id, data.type, data.date, data.quantity, data.price, data.fees, data.taxes);
      if (seenKeys.has(key)) {
        duplicates += 1;
        continue;
      }

      await transactionsService.recordTransaction(
        { symbol: asset.symbol, name: asset.name, assetType: asset.assetType, currency: asset.currency, exchange: asset.exchange, sector: asset.sector, country: asset.country, isin: asset.isin, currentPrice: asset.currentPrice, currentPriceUpdatedAt: asset.currentPriceUpdatedAt, isActive: asset.isActive, notes: asset.notes },
        {
          transactionType: data.type,
          quantity: data.quantity,
          price: data.price,
          fees: data.fees,
          taxes: data.taxes,
          transactionDate: data.date,
          broker: data.broker,
          notes: data.notes,
        }
      );
      seenKeys.add(key);
      imported += 1;
    } catch (err) {
      logServerError("importTransactionsCSVAction:row", err);
      failed.push({ rowNumber, ok: false, symbol: data.symbol, error: err instanceof Error ? err.message : "Failed to import" });
    }
  }

  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.portfolio);
  revalidatePath(ROUTES.transactions);

  failed.sort((a, b) => a.rowNumber - b.rowNumber);
  return {
    ok: true,
    summary: { totalRows: rawRows.length, imported, duplicates, failed },
  };
}
