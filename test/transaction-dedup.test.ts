import { describe, it, expect } from "vitest";
import { buildTransactionDedupKey } from "@/lib/import/transaction-dedup";

describe("buildTransactionDedupKey", () => {
  it("produces the same key for identical rows (re-uploading the same file)", () => {
    const a = buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 500, 62.4, 0, 0);
    const b = buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 500, 62.4, 0, 0);
    expect(a).toBe(b);
  });

  it("differs when any field differs", () => {
    const base = buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 500, 62.4, 0, 0);
    expect(buildTransactionDedupKey("asset-2", "BUY", "2024-01-10", 500, 62.4, 0, 0)).not.toBe(base);
    expect(buildTransactionDedupKey("asset-1", "SELL", "2024-01-10", 500, 62.4, 0, 0)).not.toBe(base);
    expect(buildTransactionDedupKey("asset-1", "BUY", "2024-01-11", 500, 62.4, 0, 0)).not.toBe(base);
    expect(buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 501, 62.4, 0, 0)).not.toBe(base);
    expect(buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 500, 62.5, 0, 0)).not.toBe(base);
    expect(buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 500, 62.4, 5, 0)).not.toBe(base);
    expect(buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 500, 62.4, 0, 5)).not.toBe(base);
  });

  it("is stable across trivial floating-point representation differences", () => {
    const a = buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 30, 1420, 45, 12);
    const b = buildTransactionDedupKey("asset-1", "BUY", "2024-01-10", 30.0, 1420.0, 45.0, 12.0);
    expect(a).toBe(b);
  });
});
