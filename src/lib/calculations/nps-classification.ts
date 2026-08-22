import type { NPSSchemeTransactionType } from "@/types/domain/nps";

export interface RawStatementRow {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number;
  nav: number;
  units: number;
}

export type ClassifiedStatementRow =
  | {
      kind: "transaction";
      transactionType: NPSSchemeTransactionType;
      date: string;
      amount: number;
      nav: number;
      units: number;
      description: string;
    }
  | { kind: "skip"; reason: string; description: string }
  | { kind: "unknown"; description: string; row: RawStatementRow };

// Real statements report units to 4 decimal places, so treat anything this
// close as an exact match rather than requiring bit-for-bit equality.
const UNITS_EPSILON = 0.001;

function isReissuanceRow(row: RawStatementRow, runningUnitsBeforeThisRow: number): boolean {
  return runningUnitsBeforeThisRow > 0 && Math.abs(row.units - runningUnitsBeforeThisRow) < UNITS_EPSILON;
}

/**
 * Classifies one raw row of a real NPS statement (NSDL/Protean, one scheme
 * at a time) into a scheme transaction, or flags it to be skipped or
 * reviewed. Pure function, no I/O — fully unit-testable, including against
 * a real statement (see test/nps-classification.test.ts, which runs this
 * over an actual subscriber's 193-row, 3-scheme consolidated statement and
 * checks the totals it produces against that subscriber's independently
 * verified invested amount and corpus).
 *
 * `runningUnitsBeforeThisRow` is the running unit total for this scheme
 * immediately BEFORE this row — needed to detect a reissuance event like
 * PFRDA's 2026 Multiple NAV Framework rollout, which credited every
 * subscriber's full existing unit balance back to them as a single row
 * under a new NAV scale. That row carries no new money and changes no unit
 * count (its `units` value exactly equals what was already held), so it
 * must never be treated as a contribution or added to the running total a
 * second time.
 */
export function classifyStatementRow(row: RawStatementRow, runningUnitsBeforeThisRow: number): ClassifiedStatementRow {
  const description = row.description.trim();
  const d = description.toLowerCase();

  if (d.includes("opening balance") || d.includes("closing balance")) {
    return { kind: "skip", reason: "informational balance row, not a transaction", description };
  }

  if (d.includes("switch in")) {
    return { kind: "transaction", transactionType: "switch_in", date: row.date, amount: row.amount, nav: row.nav, units: row.units, description };
  }
  if (d.includes("switch out")) {
    return { kind: "transaction", transactionType: "switch_out", date: row.date, amount: row.amount, nav: row.nav, units: row.units, description };
  }
  if (d.includes("billing")) {
    return { kind: "transaction", transactionType: "fee", date: row.date, amount: row.amount, nav: row.nav, units: row.units, description };
  }
  if (d.includes("withdrawal")) {
    return { kind: "transaction", transactionType: "withdrawal", date: row.date, amount: row.amount, nav: row.nav, units: row.units, description };
  }
  if (d.includes("contribution") || d.includes("arrear")) {
    return { kind: "transaction", transactionType: "contribution", date: row.date, amount: row.amount, nav: row.nav, units: row.units, description };
  }

  // Unrecognized wording. Before giving up, check for a reissuance
  // signature: units exactly matching the running total means no real
  // units were added or removed, which is the one pattern real statements
  // use for "restated under a new framework" events — regardless of
  // whatever exact phrase PFRDA uses for the next one of these.
  if (isReissuanceRow(row, runningUnitsBeforeThisRow)) {
    return {
      kind: "skip",
      reason: "unit count matches the prior running total — treated as a restatement/reissuance, not a real transaction",
      description,
    };
  }

  return { kind: "unknown", description, row };
}

export interface ClassifiedSchemeStatement {
  transactions: Extract<ClassifiedStatementRow, { kind: "transaction" }>[];
  skipped: Extract<ClassifiedStatementRow, { kind: "skip" }>[];
  unknown: Extract<ClassifiedStatementRow, { kind: "unknown" }>[];
  /** Running unit total after processing every row — this scheme's final unit balance. */
  finalUnits: number;
}

/**
 * Runs classifyStatementRow() over one scheme's statement rows IN ORDER,
 * tracking the running unit total as it goes (required for reissuance
 * detection). Returns the transactions to persist, anything skipped (for
 * an import summary), and anything unrecognized — an unrecognized row is
 * never silently classified either way, so the importer can surface it for
 * a human to look at before committing anything.
 */
export function classifySchemeStatement(rows: RawStatementRow[]): ClassifiedSchemeStatement {
  const transactions: ClassifiedSchemeStatement["transactions"] = [];
  const skipped: ClassifiedSchemeStatement["skipped"] = [];
  const unknown: ClassifiedSchemeStatement["unknown"] = [];

  let runningUnits = 0;
  for (const row of rows) {
    const classified = classifyStatementRow(row, runningUnits);
    if (classified.kind === "transaction") {
      transactions.push(classified);
      runningUnits += classified.units;
    } else if (classified.kind === "skip") {
      skipped.push(classified);
      // Running total intentionally left unchanged — a skip is either
      // purely informational (opening/closing balance) or a reissuance
      // whose units already equal the running total, so leaving it as-is
      // is correct either way.
    } else {
      unknown.push(classified);
    }
  }

  return { transactions, skipped, unknown, finalUnits: runningUnits };
}
