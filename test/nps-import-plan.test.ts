import { describe, it, expect } from "vitest";
import { selectTransactionsToImport } from "@/lib/import/nps-statement-parser";
import { buildNPSTransactionDedupKey } from "@/lib/calculations/nps";
import { parseNPSStatement } from "@/lib/import/nps-statement-parser";
import * as XLSX from "xlsx";
import type { RawStatementRow } from "@/lib/calculations/nps-classification";
import fixture from "./fixtures/nps-consolidated-sample.json";

// Same real, anonymized subscriber statement validated elsewhere: 193 rows
// across E/C/G, 3 Multiple NAV Framework reissuance rows skipped (one per
// scheme), leaving 190 real transactions.
const TOTAL_REAL_TRANSACTIONS = 190;

function aoaForScheme(rows: RawStatementRow[]): unknown[][] {
  return [["Date", "Description", "Amount (in Rs)", "NAV", "Units"], ...rows.map((r) => [new Date(r.date), r.description, r.amount, r.nav, r.units])];
}

function buildWorkbookBuffer(schemes: ("E" | "C" | "G")[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  for (const scheme of schemes) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoaForScheme(fixture[scheme] as RawStatementRow[])), scheme);
  }
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("selectTransactionsToImport — idempotent re-import planning (pure, no I/O)", () => {
  it("with no existing keys, everything is new", () => {
    const parsed = parseNPSStatement({ kind: "xlsx", data: buildWorkbookBuffer(["E", "C", "G"]) });
    const { toInsert, alreadyImported, unrecognizedRows } = selectTransactionsToImport(parsed, new Set());

    expect(toInsert).toHaveLength(TOTAL_REAL_TRANSACTIONS);
    expect(alreadyImported).toBe(0);
    expect(unrecognizedRows).toBe(0);
  });

  it("importing the exact same statement twice: second pass finds everything already imported", () => {
    const parsed = parseNPSStatement({ kind: "xlsx", data: buildWorkbookBuffer(["E", "C", "G"]) });

    const first = selectTransactionsToImport(parsed, new Set());
    expect(first.toInsert).toHaveLength(TOTAL_REAL_TRANSACTIONS);

    // Simulate persisting first.toInsert, then re-running the planner with
    // those now-existing keys against the SAME parse result.
    const existingKeys = new Set(first.toInsert.map((t) => buildNPSTransactionDedupKey(t.scheme, t.date, t.description, t.units)));
    const second = selectTransactionsToImport(parsed, existingKeys);

    expect(second.toInsert).toHaveLength(0);
    expect(second.alreadyImported).toBe(TOTAL_REAL_TRANSACTIONS);
  });

  it("a partial-overlap re-import (E already persisted) only proposes C/G's rows as new", () => {
    const eOnly = parseNPSStatement({ kind: "xlsx", data: buildWorkbookBuffer(["E"]) });
    const eSelection = selectTransactionsToImport(eOnly, new Set());
    const eKeys = new Set(eSelection.toInsert.map((t) => buildNPSTransactionDedupKey(t.scheme, t.date, t.description, t.units)));

    const full = parseNPSStatement({ kind: "xlsx", data: buildWorkbookBuffer(["E", "C", "G"]) });
    const fullSelection = selectTransactionsToImport(full, eKeys);

    // Every one of E's rows is now recognized as a duplicate...
    expect(fullSelection.alreadyImported).toBe(eSelection.toInsert.length);
    // ...and only C/G's rows are proposed as new.
    expect(fullSelection.toInsert).toHaveLength(TOTAL_REAL_TRANSACTIONS - eSelection.toInsert.length);
    expect(fullSelection.toInsert.every((t) => t.scheme === "C" || t.scheme === "G")).toBe(true);
  });

  it("a genuinely different row (different units) with the same date/description is NOT treated as a duplicate", () => {
    // Guards against the dedup key being too loose (e.g. matching on date+description alone).
    const parsed = parseNPSStatement({ kind: "xlsx", data: buildWorkbookBuffer(["E"]) });
    const first = selectTransactionsToImport(parsed, new Set());
    const firstRow = first.toInsert[0];

    // Same scheme/date/description, but a different units value — a
    // corrected re-export of the same month, say — must NOT be silently
    // dropped as a false-positive duplicate.
    const differentUnitsKey = new Set([buildNPSTransactionDedupKey(firstRow.scheme, firstRow.date, firstRow.description, firstRow.units + 1)]);
    const second = selectTransactionsToImport(parsed, differentUnitsKey);

    expect(second.alreadyImported).toBe(0);
    expect(second.toInsert.length).toBe(first.toInsert.length);
  });
});
