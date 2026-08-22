import { describe, it, expect } from "vitest";
import { classifyStatementRow, classifySchemeStatement, type RawStatementRow } from "@/lib/calculations/nps-classification";
import fixture from "./fixtures/nps-consolidated-sample.json";

describe("classifyStatementRow", () => {
  it("classifies a monthly contribution", () => {
    const row: RawStatementRow = { date: "2024-01-02", description: "By Contribution for December2023", amount: 7436, nav: 36.36, units: 204.5 };
    const result = classifyStatementRow(row, 1000);
    expect(result).toMatchObject({ kind: "transaction", transactionType: "contribution" });
  });

  it("classifies an arrear payment as a contribution", () => {
    const row: RawStatementRow = { date: "2023-05-02", description: "By Arrear - DA ARREARS", amount: 648, nav: 36.45, units: 17.7761 };
    const result = classifyStatementRow(row, 1000);
    expect(result).toMatchObject({ kind: "transaction", transactionType: "contribution" });
  });

  it("classifies a switch-in", () => {
    const row: RawStatementRow = {
      date: "2023-02-22",
      description: "By Switch In From HDFC PENSION MANAGEMENT COMPANY LIMITED SCHEME C - TIER I(CORPORATE BONDS) On account of Rebalancing",
      amount: 81.8,
      nav: 35.34,
      units: 2.3146,
    };
    const result = classifyStatementRow(row, 1000);
    expect(result).toMatchObject({ kind: "transaction", transactionType: "switch_in" });
  });

  it("classifies a switch-out (already negative in the source)", () => {
    const row: RawStatementRow = {
      date: "2024-02-20",
      description: "To Switch out to HDFC PENSION MANAGEMENT COMPANY LIMITED SCHEME G - TIER I(GOVERNMENT SECURITIES)",
      amount: -2798.78,
      nav: 46.32,
      units: -60.4226,
    };
    const result = classifyStatementRow(row, 1000);
    expect(result).toMatchObject({ kind: "transaction", transactionType: "switch_out", amount: -2798.78, units: -60.4226 });
  });

  it("classifies a quarterly billing charge as a fee", () => {
    const row: RawStatementRow = { date: "2023-04-06", description: "Billing for Q4 2022-2023", amount: -2.18, nav: 35.46, units: -0.0614 };
    const result = classifyStatementRow(row, 1000);
    expect(result).toMatchObject({ kind: "transaction", transactionType: "fee" });
  });

  it("classifies a withdrawal", () => {
    const row: RawStatementRow = { date: "2025-01-01", description: "Withdrawal on partial exit", amount: -50000, nav: 40, units: -1250 };
    const result = classifyStatementRow(row, 5000);
    expect(result).toMatchObject({ kind: "transaction", transactionType: "withdrawal" });
  });

  it("skips opening/closing balance rows", () => {
    const row: RawStatementRow = { date: "2023-01-01", description: "Opening Balance", amount: 0, nav: 36, units: 500 };
    const result = classifyStatementRow(row, 500);
    expect(result.kind).toBe("skip");
  });

  it("skips a Multiple NAV Framework reissuance by exact description", () => {
    const row: RawStatementRow = {
      date: "2026-04-01",
      description: "Credit of units due to implementation of Multiple NAV Framework",
      amount: 344504.36,
      nav: 49.5635,
      units: 6950.7676,
    };
    const result = classifyStatementRow(row, 6950.7676);
    expect(result.kind).toBe("skip");
  });

  it("skips an unrecognized restatement row purely by the units-match heuristic", () => {
    // Different, made-up wording — the classifier shouldn't need to know
    // PFRDA's exact phrase for a future reissuance event, only the pattern:
    // no real transaction changes units without changing money.
    const row: RawStatementRow = { date: "2027-01-01", description: "Some future re-platforming credit", amount: 999999, nav: 50, units: 3000 };
    const result = classifyStatementRow(row, 3000);
    expect(result.kind).toBe("skip");
  });

  it("flags truly unrecognized rows as unknown rather than guessing", () => {
    const row: RawStatementRow = { date: "2025-01-01", description: "Something entirely unfamiliar", amount: 123, nav: 40, units: 3.075 };
    const result = classifyStatementRow(row, 1000);
    expect(result.kind).toBe("unknown");
  });
});

describe("classifySchemeStatement against a real subscriber's consolidated statement", () => {
  // This fixture is an anonymized real NPS consolidated statement: 3 sheets
  // (E/C/G — no Alternative Assets scheme held), 193 total rows, including
  // 6 switch pairs and one Multiple NAV Framework reissuance per scheme.
  // The subscriber independently verified their invested amount and corpus
  // against their statement; these are the exact figures this test checks
  // the classifier reproduces.
  const EXPECTED_TOTAL_INVESTED = 770_430.0;
  const EXPECTED_TOTAL_CORPUS = 882_252.12;

  it("produces no unknown rows across all three schemes", () => {
    for (const scheme of ["E", "C", "G"] as const) {
      const { unknown } = classifySchemeStatement(fixture[scheme] as RawStatementRow[]);
      expect(unknown).toEqual([]);
    }
  });

  it("skips exactly one row per scheme (the Multiple NAV Framework reissuance)", () => {
    for (const scheme of ["E", "C", "G"] as const) {
      const { skipped } = classifySchemeStatement(fixture[scheme] as RawStatementRow[]);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].description.toLowerCase()).toContain("multiple nav framework");
    }
  });

  it("reproduces the subscriber's independently verified total invested amount", () => {
    let totalInvested = 0;
    for (const scheme of ["E", "C", "G"] as const) {
      const { transactions } = classifySchemeStatement(fixture[scheme] as RawStatementRow[]);
      for (const t of transactions) {
        if (t.transactionType === "contribution") totalInvested += t.amount;
      }
    }
    expect(totalInvested).toBeCloseTo(EXPECTED_TOTAL_INVESTED, 2);
  });

  it("reproduces the subscriber's independently verified total corpus (units held × last statement NAV, per scheme)", () => {
    let totalCorpus = 0;
    for (const scheme of ["E", "C", "G"] as const) {
      const rows = fixture[scheme] as RawStatementRow[];
      const { finalUnits } = classifySchemeStatement(rows);
      const lastNav = rows[rows.length - 1].nav;
      totalCorpus += finalUnits * lastNav;
    }
    expect(totalCorpus).toBeCloseTo(EXPECTED_TOTAL_CORPUS, 2);
  });

  it("keeps switch_in/switch_out in the running unit total despite excluding them from invested amount", () => {
    // Sanity check that switches aren't silently dropped: the E scheme's
    // final units should differ from a hypothetical contributions-only sum,
    // proving switch rows are actually being added into the running total.
    const rows = fixture.E as RawStatementRow[];
    const { transactions, finalUnits } = classifySchemeStatement(rows);
    const contributionsOnlyUnits = transactions.filter((t) => t.transactionType === "contribution").reduce((sum, t) => sum + t.units, 0);
    expect(finalUnits).not.toBeCloseTo(contributionsOnlyUnits, 2);
  });
});
