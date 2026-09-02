import { describe, it, expect } from "vitest";
import { isStale } from "@/lib/utils/date";

describe("isStale", () => {
  it("returns false for a timestamp from a few minutes ago", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(isStale(recent)).toBe(false);
  });

  it("returns false for a timestamp just under the default 24h threshold", () => {
    const almostStale = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    expect(isStale(almostStale)).toBe(false);
  });

  it("returns true for a timestamp well past the default 24h threshold", () => {
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(old)).toBe(true);
  });

  it("respects a custom threshold", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(isStale(twoHoursAgo, 1)).toBe(true);
    expect(isStale(twoHoursAgo, 4)).toBe(false);
  });

  it("returns false (not stale) for an invalid date string rather than throwing", () => {
    expect(isStale("not-a-date")).toBe(false);
  });
});
