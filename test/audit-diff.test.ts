import { describe, it, expect } from "vitest";
import { buildDiffRows, formatFieldValue } from "@/lib/audit/build-diff";

describe("buildDiffRows", () => {
  it("shows only fields that actually changed for an update", () => {
    const rows = buildDiffRows({
      action: "update",
      oldData: { id: "1", amount: 100, notes: "old" },
      newData: { id: "1", amount: 150, notes: "old" },
    });
    expect(rows).toEqual([{ field: "amount", before: "100", after: "150", changed: true }]);
  });

  it("shows every visible field for a delete, before === after", () => {
    const rows = buildDiffRows({
      action: "delete",
      oldData: { id: "1", amount: 100, notes: "gone" },
      newData: null,
    });
    expect(rows).toEqual([
      { field: "amount", before: "100", after: "100", changed: false },
      { field: "notes", before: "gone", after: "gone", changed: false },
    ]);
  });

  it("hides id, user_id, created_at, updated_at", () => {
    const rows = buildDiffRows({
      action: "update",
      oldData: { id: "1", user_id: "u1", created_at: "t0", updated_at: "t0", amount: 100 },
      newData: { id: "1", user_id: "u1", created_at: "t0", updated_at: "t1", amount: 200 },
    });
    expect(rows).toEqual([{ field: "amount", before: "100", after: "200", changed: true }]);
  });

  it("returns no rows for a no-op update (nothing actually changed)", () => {
    const rows = buildDiffRows({
      action: "update",
      oldData: { id: "1", amount: 100 },
      newData: { id: "1", amount: 100 },
    });
    expect(rows).toEqual([]);
  });

  it("sorts rows alphabetically by field name", () => {
    const rows = buildDiffRows({
      action: "update",
      oldData: { zeta: 1, alpha: 1 },
      newData: { zeta: 2, alpha: 2 },
    });
    expect(rows.map((r) => r.field)).toEqual(["alpha", "zeta"]);
  });
});

describe("formatFieldValue", () => {
  it("renders null/undefined as an em dash", () => {
    expect(formatFieldValue(null)).toBe("—");
    expect(formatFieldValue(undefined)).toBe("—");
  });

  it("stringifies numbers and strings plainly", () => {
    expect(formatFieldValue(42)).toBe("42");
    expect(formatFieldValue("abc")).toBe("abc");
  });

  it("JSON-stringifies objects", () => {
    expect(formatFieldValue({ a: 1 })).toBe('{"a":1}');
  });
});
