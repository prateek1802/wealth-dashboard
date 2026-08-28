import { describe, it, expect } from "vitest";
import { sanitizePrice } from "@/lib/utils/sanitize-price";

describe("sanitizePrice", () => {
  it("passes through a normal finite number unchanged", () => {
    expect(sanitizePrice(1725.4)).toBe(1725.4);
  });

  it("passes through null unchanged", () => {
    expect(sanitizePrice(null)).toBeNull();
  });

  it("converts a literal NaN number to null", () => {
    expect(sanitizePrice(NaN)).toBeNull();
  });

  it('converts the string "NaN" to null — what a Postgres numeric NaN column looks like once PostgREST serializes it to JSON', () => {
    expect(sanitizePrice("NaN")).toBeNull();
  });

  it("parses a valid numeric string (defensive — in case a numeric column ever comes back stringified)", () => {
    expect(sanitizePrice("1725.4")).toBe(1725.4);
  });

  it("converts Infinity/-Infinity to null", () => {
    expect(sanitizePrice(Infinity)).toBeNull();
    expect(sanitizePrice(-Infinity)).toBeNull();
  });

  it("converts undefined and other garbage to null rather than throwing", () => {
    expect(sanitizePrice(undefined)).toBeNull();
    expect(sanitizePrice({})).toBeNull();
    expect(sanitizePrice("abc")).toBeNull();
  });
});
