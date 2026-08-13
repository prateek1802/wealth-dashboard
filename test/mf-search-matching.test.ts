import { describe, it, expect } from "vitest";
import { matchesMFQuery } from "@/lib/market-data/symbol-search";

// Regression coverage: mutual fund search broke twice before this test
// existed — once by trusting mfapi.in's own search endpoint's matching
// behavior, once from a leftover code-merge bug that silently duplicated
// dead code after a real fix. This exercises the actual matching predicate
// directly, with no network dependency, using the exact cases the user
// reported as broken.

describe("matchesMFQuery", () => {
  it("matches words that are not adjacent in the real scheme name", () => {
    expect(matchesMFQuery("PGIM India Midcap Opportunities Fund - Direct Plan - Growth", "pgim midcap")).toBe(true);
  });

  it("matches SBI Contra even with extra words in the real name", () => {
    expect(matchesMFQuery("SBI Contra Fund - Direct Plan - Growth", "sbi contra")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesMFQuery("HDFC Flexi Cap Fund", "HDFC FLEXI")).toBe(true);
  });

  it("requires every word to be present, not just one", () => {
    expect(matchesMFQuery("SBI Bluechip Fund", "sbi contra")).toBe(false);
  });

  it("word order in the query does not matter", () => {
    expect(matchesMFQuery("Parag Parikh Flexi Cap Fund", "flexi parag")).toBe(true);
  });

  it("returns false for an empty or whitespace-only query", () => {
    expect(matchesMFQuery("HDFC Flexi Cap Fund", "  ")).toBe(false);
  });

  it("ignores single-character words (too generic to filter on)", () => {
    // "a" is dropped as too short; "contra" alone must still match.
    expect(matchesMFQuery("SBI Contra Fund", "a contra")).toBe(true);
  });
});
