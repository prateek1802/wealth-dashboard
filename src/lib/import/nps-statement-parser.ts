import * as XLSX from "xlsx";
import { NPS_SCHEMES, type NPSScheme } from "@/constants/nps";
import { classifySchemeStatement, type ClassifiedStatementRow, type RawStatementRow } from "@/lib/calculations/nps-classification";
import { buildNPSTransactionDedupKey } from "@/lib/calculations/nps";

type Transaction = Extract<ClassifiedStatementRow, { kind: "transaction" }>;
export type PairedTransaction = Transaction & { switchGroupId: string | null };

// ---------------------------------------------------------------------------
// FORMAT B — consolidated multi-year export, one sheet per scheme (columns:
// Date, Description, Amount (in Rs), NAV, Units). Validated against a real
// 193-row, 3-scheme statement — see test/nps-statement-parser.test.ts.
// ---------------------------------------------------------------------------

function normalizeSchemeSheetName(sheetName: string): NPSScheme | null {
  const trimmed = sheetName.trim().toUpperCase();
  return (NPS_SCHEMES as readonly string[]).includes(trimmed) ? (trimmed as NPSScheme) : null;
}

function normalizeFormatBRow(row: Record<string, unknown>): RawStatementRow | null {
  const date = row["Date"];
  const description = row["Description"];
  const amount = row["Amount (in Rs)"] ?? row["Amount"];
  const nav = row["NAV"];
  const units = row["Units"];
  if (date == null || description == null || amount == null || nav == null || units == null) return null;

  const isoDate = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).trim();
  return { date: isoDate, description: String(description).trim(), amount: Number(amount), nav: Number(nav), units: Number(units) };
}

/**
 * Reads a consolidated multi-sheet NPS statement workbook (Format B) via
 * SheetJS. Sheets not named E/C/G/A (e.g. a summary tab, if the export ever
 * includes one) are ignored rather than erroring, since only scheme sheets
 * matter here.
 */
export function parseFormatBWorkbook(data: ArrayBuffer | Uint8Array): Partial<Record<NPSScheme, RawStatementRow[]>> {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const result: Partial<Record<NPSScheme, RawStatementRow[]>> = {};

  for (const sheetName of workbook.SheetNames) {
    const scheme = normalizeSchemeSheetName(sheetName);
    if (!scheme) continue;
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    const rows = rawRows.map(normalizeFormatBRow).filter((r): r is RawStatementRow => r !== null);
    if (rows.length > 0) result[scheme] = rows;
  }

  return result;
}

// ---------------------------------------------------------------------------
// FORMAT A — single-period CRA CSV export ("NPS Transaction Statement for
// Tier I Account"): header section (PRAN, subscriber, scheme choice), an
// Investment Summary (reported XIRR), a Scheme Wise Summary, a Contribution/
// Redemption Details table (employee/employer split), then one Transaction
// Details table per scheme.
//
// CAVEAT: unlike Format B, this parser has NOT been validated against a real
// export — no Format A sample was available when this was written, only the
// spec's textual description of its layout. Treat parse results from this
// path with more caution than Format B's, and prefer getting a real sample
// to validate against before relying on it for anything beyond a rough
// import.
// ---------------------------------------------------------------------------

export interface FormatAMetadata {
  pran: string | null;
  subscriberName: string | null;
  reportedXIRR: number | null;
  reportedTotalContribution: number | null;
  employeeContributionTotal: number | null;
  employerContributionTotal: number | null;
}

const TRANSACTION_HEADER_RE = /^\s*date\s*,\s*description\s*,\s*amount(?:\s*\(in\s*rs\.?\))?\s*,\s*nav\s*,\s*units\s*,?\s*$/i;
const SCHEME_HINT_RE = /scheme\s*[-:]?\s*([ECGA])\b|\b(equity|corporate\s*bonds?|government\s*securities?|alternative)\b/i;

function splitCsvLine(line: string): string[] {
  // Simple split is enough for this format: none of the fields we care
  // about (date/description/amount/nav/units) are expected to contain
  // embedded commas in real CRA exports.
  return line.split(",").map((c) => c.trim());
}

function schemeHintToScheme(hint: string): NPSScheme | null {
  const upper = hint.toUpperCase();
  if (upper === "E" || upper === "C" || upper === "G" || upper === "A") return upper as NPSScheme;
  const lower = hint.toLowerCase();
  if (lower.includes("equity")) return "E";
  if (lower.includes("corporate")) return "C";
  if (lower.includes("government")) return "G";
  if (lower.includes("alternative")) return "A";
  return null;
}

function findNearbyScheme(lines: string[], headerIndex: number): NPSScheme | null {
  // Scan a small window of lines before the header row for a scheme name —
  // CRA statements typically title each scheme's transaction table with
  // something like "Transaction Details - Scheme E - Tier I (Equity)".
  const WINDOW = 6;
  for (let i = headerIndex - 1; i >= Math.max(0, headerIndex - WINDOW); i--) {
    const match = lines[i].match(SCHEME_HINT_RE);
    if (match) {
      const hint = match[1] ?? match[2];
      const scheme = schemeHintToScheme(hint);
      if (scheme) return scheme;
    }
  }
  return null;
}

function normalizeDateString(raw: string): string {
  // CRA exports have shown dd-mm-yyyy and dd/mm/yyyy; fall back to raw text
  // (which classification/downstream code can still surface as a warning)
  // rather than guessing wrong.
  const trimmed = raw.trim();
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
}

export function parseFormatACsv(text: string): { schemes: Partial<Record<NPSScheme, RawStatementRow[]>>; metadata: FormatAMetadata } {
  const lines = text.split(/\r?\n/);
  const schemes: Partial<Record<NPSScheme, RawStatementRow[]>> = {};
  const metadata: FormatAMetadata = {
    pran: null,
    subscriberName: null,
    reportedXIRR: null,
    reportedTotalContribution: null,
    employeeContributionTotal: null,
    employerContributionTotal: null,
  };

  let currentScheme: NPSScheme | null = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (metadata.pran === null) {
      const match = line.match(/pran[^0-9a-z]{0,10}([0-9]{8}[0-9A-Z]{2,4})/i);
      if (match) metadata.pran = match[1];
    }
    if (metadata.subscriberName === null && /subscriber\s*name/i.test(line)) {
      const parts = splitCsvLine(line);
      const idx = parts.findIndex((p) => /subscriber\s*name/i.test(p));
      if (idx >= 0 && parts[idx + 1]) metadata.subscriberName = parts[idx + 1];
    }
    if (metadata.reportedXIRR === null && /xirr/i.test(line)) {
      const m = line.match(/(-?\d+(\.\d+)?)\s*%/);
      if (m) metadata.reportedXIRR = parseFloat(m[1]);
    }
    if (metadata.reportedTotalContribution === null && /total\s*contribution/i.test(line)) {
      const m = line.match(/([\d,]+\.\d{1,4})/);
      if (m) metadata.reportedTotalContribution = parseFloat(m[1].replace(/,/g, ""));
    }
    if (metadata.employeeContributionTotal === null && /employee\s*contribution/i.test(line)) {
      const m = line.match(/([\d,]+\.\d{1,4})/);
      if (m) metadata.employeeContributionTotal = parseFloat(m[1].replace(/,/g, ""));
    }
    if (metadata.employerContributionTotal === null && /employer\s*contribution/i.test(line)) {
      const m = line.match(/([\d,]+\.\d{1,4})/);
      if (m) metadata.employerContributionTotal = parseFloat(m[1].replace(/,/g, ""));
    }

    if (TRANSACTION_HEADER_RE.test(line)) {
      inTable = true;
      currentScheme = findNearbyScheme(lines, i);
      continue;
    }

    if (inTable) {
      const cols = splitCsvLine(line);
      const looksLikeDataRow = cols.length >= 5 && cols[0] !== "" && !Number.isNaN(Date.parse(normalizeDateString(cols[0])));
      if (!looksLikeDataRow) {
        inTable = false;
        currentScheme = null;
        continue;
      }
      if (!currentScheme) continue; // couldn't identify which scheme this table belongs to — skip rather than guess
      const [date, description, amount, nav, units] = cols;
      const row: RawStatementRow = {
        date: normalizeDateString(date),
        description,
        amount: parseFloat(amount.replace(/,/g, "")),
        nav: parseFloat(nav),
        units: parseFloat(units.replace(/,/g, "")),
      };
      (schemes[currentScheme] ??= []).push(row);
    }
  }

  return { schemes, metadata };
}

// ---------------------------------------------------------------------------
// SWITCH PAIRING
//
// VALIDATED FINDING (contradicts the spec's "same date" assumption): in the
// real statement used to validate this feature, a switch_out's date and its
// matching switch_in's date were consistently 2 CALENDAR DAYS APART (e.g.
// switch_out on the 20th, switch_in on the 22nd) — a settlement lag, not a
// same-day event. The rupee amount, however, matched exactly to the paisa
// in every one of the 8 validated pairs. So pairing here matches on
// (opposite sign, ~equal absolute amount, different scheme) within a date
// WINDOW, not an exact date.
// ---------------------------------------------------------------------------

export interface SwitchPairingWarning {
  scheme: NPSScheme;
  date: string;
  amount: number;
  reason: string;
}

const SWITCH_DATE_WINDOW_DAYS = 14;
const SWITCH_AMOUNT_EPSILON = 0.01;

export function pairSwitches(
  perScheme: Partial<Record<NPSScheme, Transaction[]>>
): { paired: Partial<Record<NPSScheme, PairedTransaction[]>>; warnings: SwitchPairingWarning[] } {
  interface Candidate {
    scheme: NPSScheme;
    index: number;
    date: string;
    amount: number;
  }

  const outs: Candidate[] = [];
  const ins: Candidate[] = [];
  const paired: Partial<Record<NPSScheme, PairedTransaction[]>> = {};

  for (const scheme of NPS_SCHEMES) {
    const txns = perScheme[scheme];
    if (!txns) continue;
    paired[scheme] = txns.map((t) => ({ ...t, switchGroupId: null }));
    txns.forEach((t, index) => {
      if (t.transactionType === "switch_out") outs.push({ scheme, index, date: t.date, amount: t.amount });
      if (t.transactionType === "switch_in") ins.push({ scheme, index, date: t.date, amount: t.amount });
    });
  }

  const warnings: SwitchPairingWarning[] = [];
  const usedIns = new Set<string>();
  let groupCounter = 0;

  for (const out of outs) {
    const target = Math.abs(out.amount);
    const outDate = new Date(out.date).getTime();

    let best: Candidate | null = null;
    let bestDiffDays = Infinity;

    for (const inn of ins) {
      const key = `${inn.scheme}:${inn.index}`;
      if (usedIns.has(key)) continue;
      if (inn.scheme === out.scheme) continue; // a real switch always moves money to a DIFFERENT scheme
      if (Math.abs(Math.abs(inn.amount) - target) > SWITCH_AMOUNT_EPSILON) continue;
      const diffDays = Math.abs(new Date(inn.date).getTime() - outDate) / 86_400_000;
      if (diffDays > SWITCH_DATE_WINDOW_DAYS) continue;
      if (diffDays < bestDiffDays) {
        bestDiffDays = diffDays;
        best = inn;
      }
    }

    if (best) {
      const groupId = `switch-${groupCounter++}`;
      usedIns.add(`${best.scheme}:${best.index}`);
      paired[out.scheme]![out.index].switchGroupId = groupId;
      paired[best.scheme]![best.index].switchGroupId = groupId;
    } else {
      warnings.push({ scheme: out.scheme, date: out.date, amount: out.amount, reason: "no matching switch_in found within the date/amount window" });
    }
  }

  for (const inn of ins) {
    if (!usedIns.has(`${inn.scheme}:${inn.index}`)) {
      warnings.push({ scheme: inn.scheme, date: inn.date, amount: inn.amount, reason: "no matching switch_out found within the date/amount window" });
    }
  }

  return { paired, warnings };
}

// ---------------------------------------------------------------------------
// ORCHESTRATION
// ---------------------------------------------------------------------------

export interface SchemeParseResult {
  transactions: PairedTransaction[];
  skipped: { reason: string; description: string }[];
  unknown: { description: string; row: RawStatementRow }[];
  finalUnits: number;
  lastNav: number | null;
  lastNavDate: string | null;
}

export interface NPSStatementParseResult {
  format: "A" | "B";
  metadata: FormatAMetadata | null;
  schemes: Partial<Record<NPSScheme, SchemeParseResult>>;
  totalInvested: number;
  switchWarnings: SwitchPairingWarning[];
}

export function parseNPSStatement(input: { kind: "xlsx"; data: ArrayBuffer | Uint8Array } | { kind: "csv"; text: string }): NPSStatementParseResult {
  let rawSchemes: Partial<Record<NPSScheme, RawStatementRow[]>>;
  let metadata: FormatAMetadata | null = null;
  const format: "A" | "B" = input.kind === "xlsx" ? "B" : "A";

  if (input.kind === "xlsx") {
    rawSchemes = parseFormatBWorkbook(input.data);
  } else {
    const parsedCsv = parseFormatACsv(input.text);
    rawSchemes = parsedCsv.schemes;
    metadata = parsedCsv.metadata;
  }

  const transactionsOnly: Partial<Record<NPSScheme, Transaction[]>> = {};
  const byScheme: Partial<Record<NPSScheme, ReturnType<typeof classifySchemeStatement>>> = {};
  for (const scheme of NPS_SCHEMES) {
    const rows = rawSchemes[scheme];
    if (!rows) continue;
    const classified = classifySchemeStatement(rows);
    byScheme[scheme] = classified;
    transactionsOnly[scheme] = classified.transactions;
  }

  const { paired, warnings: switchWarnings } = pairSwitches(transactionsOnly);

  let totalInvested = 0;
  const schemes: NPSStatementParseResult["schemes"] = {};
  for (const scheme of NPS_SCHEMES) {
    const classified = byScheme[scheme];
    if (!classified) continue;
    const pairedTxns = paired[scheme] ?? [];
    for (const t of pairedTxns) {
      if (t.transactionType === "contribution") totalInvested += t.amount;
    }
    const rows = rawSchemes[scheme] ?? [];
    const lastRow = rows[rows.length - 1];
    schemes[scheme] = {
      transactions: pairedTxns,
      skipped: classified.skipped,
      unknown: classified.unknown,
      finalUnits: classified.finalUnits,
      lastNav: lastRow?.nav ?? null,
      lastNavDate: lastRow?.date ?? null,
    };
  }

  return { format, metadata, schemes, totalInvested, switchWarnings };
}

// ---------------------------------------------------------------------------
// IMPORT PLANNING (idempotent re-import)
//
// Pure — takes a parse result and the set of dedup keys already persisted
// for this account, and decides what's genuinely new vs already imported.
// No DB access here; the service layer (which does the actual I/O) is a
// thin wrapper around this. This is what test/nps-import-plan.test.ts
// exercises directly against the real fixture, since the service/
// repository layer can't be imported into a Vitest test at all (they pull
// in Next.js's `server-only` guard).
// ---------------------------------------------------------------------------

export interface ImportSelection {
  toInsert: Array<PairedTransaction & { scheme: NPSScheme }>;
  alreadyImported: number;
  unrecognizedRows: number;
}

export function selectTransactionsToImport(parseResult: NPSStatementParseResult, existingKeys: ReadonlySet<string>): ImportSelection {
  const toInsert: ImportSelection["toInsert"] = [];
  let alreadyImported = 0;
  let unrecognizedRows = 0;

  for (const scheme of NPS_SCHEMES) {
    const schemeResult = parseResult.schemes[scheme];
    if (!schemeResult) continue;
    unrecognizedRows += schemeResult.unknown.length;
    for (const t of schemeResult.transactions) {
      const key = buildNPSTransactionDedupKey(scheme, t.date, t.description, t.units);
      if (existingKeys.has(key)) {
        alreadyImported += 1;
        continue;
      }
      toInsert.push({ ...t, scheme });
    }
  }

  return { toInsert, alreadyImported, unrecognizedRows };
}
