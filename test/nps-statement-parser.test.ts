import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseFormatBWorkbook, parseFormatACsv, pairSwitches, parseNPSStatement } from "@/lib/import/nps-statement-parser";
import { classifySchemeStatement, type RawStatementRow, type ClassifiedStatementRow } from "@/lib/calculations/nps-classification";
import fixture from "./fixtures/nps-consolidated-sample.json";

type Transaction = Extract<ClassifiedStatementRow, { kind: "transaction" }>;

function buildTestWorkbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return out as ArrayBuffer;
}

describe("parseFormatBWorkbook", () => {
  it("reads a real SheetJS-produced xlsx buffer and normalizes dates/columns", () => {
    const buffer = buildTestWorkbook({
      E: [
        ["Date", "Description", "Amount (in Rs)", "NAV", "Units"],
        [new Date(2024, 0, 15), "By Contribution for December2023", 7436, 36.36, 204.5],
      ],
      C: [
        ["Date", "Description", "Amount (in Rs)", "NAV", "Units"],
        [new Date(2024, 0, 15), "By Contribution for December2023", 5000, 30.1, 166.1],
      ],
    });

    const result = parseFormatBWorkbook(buffer);

    expect(result.E).toHaveLength(1);
    expect(result.E![0]).toMatchObject({ date: "2024-01-15", description: "By Contribution for December2023", amount: 7436, nav: 36.36, units: 204.5 });
    expect(result.C).toHaveLength(1);
  });

  it("ignores sheets that aren't named E/C/G/A", () => {
    const buffer = buildTestWorkbook({
      Summary: [["Some", "Random", "Sheet"]],
      G: [
        ["Date", "Description", "Amount (in Rs)", "NAV", "Units"],
        [new Date(2024, 0, 1), "By Contribution for December2023", 3000, 27, 111.1],
      ],
    });

    const result = parseFormatBWorkbook(buffer);

    expect((result as Record<string, unknown>).Summary).toBeUndefined();
    expect(result.G).toHaveLength(1);
  });
});

describe("parseFormatACsv (best-effort — no real Format A sample available)", () => {
  const sample = [
    "NPS Transaction Statement for Tier I Account",
    "PRAN,12345678901234",
    "Subscriber Name,Test Subscriber",
    "Investment Summary",
    "XIRR,11.25%",
    "Total Contribution,50000.00",
    "Contribution/Redemption Details",
    "Employee Contribution,30000.00",
    "Employer Contribution,20000.00",
    "Transaction Details - Scheme E - Tier I (Equity)",
    "Date,Description,Amount (in Rs),NAV,Units",
    "01-01-2024,By Contribution for December2023,7436,36.36,204.5",
    "02-02-2024,By Contribution for January2024,7436,35.42,209.9",
    "",
    "Transaction Details - Scheme C - Tier I (Corporate Bonds)",
    "Date,Description,Amount (in Rs),NAV,Units",
    "01-01-2024,By Contribution for December2023,5000,30.1,166.1",
    "",
  ].join("\n");

  it("extracts metadata from the header/summary sections", () => {
    const { metadata } = parseFormatACsv(sample);
    expect(metadata.pran).toBe("12345678901234".slice(0, 12)); // regex caps at 12 trailing chars after 8 digits
    expect(metadata.reportedXIRR).toBe(11.25);
    expect(metadata.reportedTotalContribution).toBe(50000);
    expect(metadata.employeeContributionTotal).toBe(30000);
    expect(metadata.employerContributionTotal).toBe(20000);
  });

  it("extracts per-scheme transaction rows using the scheme hint above each table", () => {
    const { schemes } = parseFormatACsv(sample);
    expect(schemes.E).toHaveLength(2);
    expect(schemes.E![0]).toMatchObject({ date: "2024-01-01", amount: 7436, nav: 36.36, units: 204.5 });
    expect(schemes.C).toHaveLength(1);
    expect(schemes.G).toBeUndefined();
  });
});

describe("pairSwitches against a real subscriber's switch history", () => {
  // Reuses the same real fixture as nps-classification.test.ts. This
  // validates a finding from the real data that CONTRADICTS the initial
  // spec assumption: switch_out and its matching switch_in are NOT on the
  // same date (there's a consistent ~2-day settlement lag) — only the
  // rupee amount matches exactly. Pairing here is amount-based within a
  // date window, not same-date.
  function classifiedTransactions(scheme: "E" | "C" | "G"): Transaction[] {
    return classifySchemeStatement(fixture[scheme] as RawStatementRow[]).transactions;
  }

  it("pairs every switch leg across all three schemes with zero unmatched warnings", () => {
    const { paired, warnings } = pairSwitches({
      E: classifiedTransactions("E"),
      C: classifiedTransactions("C"),
      G: classifiedTransactions("G"),
    });

    expect(warnings).toEqual([]);

    const allSwitchGroupIds = new Set<string>();
    for (const scheme of ["E", "C", "G"] as const) {
      for (const t of paired[scheme] ?? []) {
        if (t.transactionType === "switch_in" || t.transactionType === "switch_out") {
          expect(t.switchGroupId).not.toBeNull();
          allSwitchGroupIds.add(t.switchGroupId!);
        }
      }
    }
    // 8 total switch legs (2023, 2024, 2025, 2026 events, 2 legs each direction) → 4 pairs... 
    // actual real data: E carries 8 switch rows (2 per year × 4 years), C and G carry 4 each (1 per year × 4 years) → 16 legs total → 8 pairs
    expect(allSwitchGroupIds.size).toBe(8);
  });

  it("never pairs two legs within the same scheme", () => {
    const { paired } = pairSwitches({ E: classifiedTransactions("E"), C: classifiedTransactions("C"), G: classifiedTransactions("G") });
    for (const scheme of ["E", "C", "G"] as const) {
      const bySwitchGroup = new Map<string, number>();
      for (const t of paired[scheme] ?? []) {
        if (t.switchGroupId) bySwitchGroup.set(t.switchGroupId, (bySwitchGroup.get(t.switchGroupId) ?? 0) + 1);
      }
      // if a group ever had 2 legs within the SAME scheme's array, one of
      // the two would be redundant with itself -- verify every group in
      // this scheme appears exactly once per scheme (its pair partner is
      // necessarily in a different scheme's array)
      for (const count of bySwitchGroup.values()) expect(count).toBe(1);
    }
  });
});

describe("parseNPSStatement orchestration", () => {
  it("produces the same validated total-invested figure end-to-end via the real xlsx-reading path", () => {
    const buffer = buildTestWorkbook({
      E: [["Date", "Description", "Amount (in Rs)", "NAV", "Units"], ...(fixture.E as RawStatementRow[]).map((r) => [new Date(r.date), r.description, r.amount, r.nav, r.units])],
      C: [["Date", "Description", "Amount (in Rs)", "NAV", "Units"], ...(fixture.C as RawStatementRow[]).map((r) => [new Date(r.date), r.description, r.amount, r.nav, r.units])],
      G: [["Date", "Description", "Amount (in Rs)", "NAV", "Units"], ...(fixture.G as RawStatementRow[]).map((r) => [new Date(r.date), r.description, r.amount, r.nav, r.units])],
    });

    const result = parseNPSStatement({ kind: "xlsx", data: buffer });

    expect(result.format).toBe("B");
    expect(result.totalInvested).toBeCloseTo(770_430.0, 2);
    expect(result.switchWarnings).toEqual([]);
    expect(Object.values(result.schemes).every((s) => s!.unknown.length === 0)).toBe(true);
  });
});
