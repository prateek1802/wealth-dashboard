import { describe, it, expect } from "vitest";
import { normalizeDateString } from "@/lib/utils/date-normalize";

// Regression coverage for the "Invalid time value" crash: CSV import used
// to validate dates with Date.parse() (lenient) but store them unnormalized,
// while every display path uses date-fns' parseISO() (strict) — a format
// like "15-04-2023" passed validation but crashed the Transactions page the
// moment it rendered. Every date reaching storage now goes through this.

describe("normalizeDateString", () => {
  it("passes through strict ISO unchanged", () => {
    expect(normalizeDateString("2023-04-15")).toBe("2023-04-15");
  });

  it("normalizes DD/MM/YYYY (day-first default)", () => {
    expect(normalizeDateString("15/04/2023")).toBe("2023-04-15");
  });

  it("normalizes DD-MM-YYYY", () => {
    expect(normalizeDateString("15-04-2023")).toBe("2023-04-15");
  });

  it("resolves unambiguous MM/DD/YYYY when the first component can't be a day", () => {
    // 13 can't be a month, so this must be MM/DD -> April 13.
    // Using a case where day-first would be invalid: "13/04/2023" -> day=13, month=4, valid as DD/MM already.
    // Use a genuinely unambiguous MM/DD case instead: month=13 impossible, so second component is the day.
    expect(normalizeDateString("04-13-2023")).toBe("2023-04-13");
  });

  it("normalizes an Excel date serial", () => {
    // Serial 45000 = 2023-03-15 (Excel epoch 1899-12-30)
    expect(normalizeDateString("45000")).toBe("2023-03-15");
  });

  it("returns null for garbage input instead of guessing", () => {
    expect(normalizeDateString("not a date")).toBe(null);
    expect(normalizeDateString("")).toBe(null);
    expect(normalizeDateString("32/13/2023")).toBe(null);
  });
});
