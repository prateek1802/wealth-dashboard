import { describe, it, expect } from "vitest";
import { calculateCAGR, calculateXIRR, projectFutureValue, selectCAGRBaseSnapshot } from "@/lib/calculations/returns";

describe("calculateCAGR", () => {
  it("computes CAGR for doubling over 3 years", () => {
    const result = calculateCAGR(1000, 2000, 3);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value).toBeCloseTo(25.99, 1);
    }
  });

  it("reports insufficient_data for zero years", () => {
    const result = calculateCAGR(1000, 2000, 0);
    expect(result.status).toBe("insufficient_data");
  });
});

describe("selectCAGRBaseSnapshot", () => {
  it("skips leading zero-net-worth snapshots and uses the first positive one — the real bug: an account's earliest snapshot(s) can legitimately be ₹0 (recorded before any holdings existed), which previously left CAGR permanently stuck on 'insufficient data' even with months of good data right after", () => {
    const snapshots = [
      { netWorth: 0, snapshotDate: "2026-08-14" },
      { netWorth: 0, snapshotDate: "2026-08-15" },
      { netWorth: 50000, snapshotDate: "2026-08-16" },
      { netWorth: 55000, snapshotDate: "2026-09-01" },
    ];
    const base = selectCAGRBaseSnapshot(snapshots);
    expect(base?.snapshotDate).toBe("2026-08-16");
    expect(base?.netWorth).toBe(50000);
  });

  it("computes a real CAGR value using the adjusted base, where the raw first snapshot would have failed", () => {
    const snapshots = [
      { netWorth: 0, snapshotDate: "2024-01-01" },
      { netWorth: 1000, snapshotDate: "2024-01-02" },
      { netWorth: 2000, snapshotDate: "2027-01-02" }, // 3 years after the adjusted base
    ];
    const base = selectCAGRBaseSnapshot(snapshots);
    expect(base).toBeDefined();
    if (!base) return;
    const years = (new Date(snapshots[2].snapshotDate).getTime() - new Date(base.snapshotDate).getTime()) / (365 * 24 * 60 * 60 * 1000);
    const result = calculateCAGR(base.netWorth, snapshots[2].netWorth, years);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.value).toBeCloseTo(25.99, 1); // doubling over ~3 years
  });

  it("uses the very first snapshot unchanged when it's already positive (no regression for the common case)", () => {
    const snapshots = [
      { netWorth: 1000, snapshotDate: "2024-01-01" },
      { netWorth: 2000, snapshotDate: "2025-01-01" },
    ];
    expect(selectCAGRBaseSnapshot(snapshots)?.snapshotDate).toBe("2024-01-01");
  });

  it("returns undefined when every snapshot is zero/negative, rather than picking a bad base", () => {
    const snapshots = [
      { netWorth: 0, snapshotDate: "2024-01-01" },
      { netWorth: -500, snapshotDate: "2024-01-02" },
    ];
    expect(selectCAGRBaseSnapshot(snapshots)).toBeUndefined();
  });

  it("returns undefined for an empty list", () => {
    expect(selectCAGRBaseSnapshot([])).toBeUndefined();
  });
});

describe("calculateXIRR", () => {
  it("computes a reasonable rate for a simple buy-then-sell", () => {
    const result = calculateXIRR([
      { date: "2023-01-01", amount: -1000 },
      { date: "2024-01-01", amount: 1100 },
    ]);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value).toBeCloseTo(10, 0);
    }
  });

  it("reports insufficient_data with a single cash flow", () => {
    const result = calculateXIRR([{ date: "2023-01-01", amount: -1000 }]);
    expect(result.status).toBe("insufficient_data");
  });

  it("reports insufficient_data when all flows are the same sign", () => {
    const result = calculateXIRR([
      { date: "2023-01-01", amount: -1000 },
      { date: "2023-06-01", amount: -500 },
    ]);
    expect(result.status).toBe("insufficient_data");
  });
});

describe("projectFutureValue", () => {
  it("compounds a value forward at a fixed rate", () => {
    // 100,000 at 10% for 3 years = 100000 * 1.1^3 = 133,100
    expect(projectFutureValue(100_000, 10, 3)).toBeCloseTo(133_100, 0);
  });

  it("returns the current value unchanged for zero or negative years", () => {
    expect(projectFutureValue(50_000, 12, 0)).toBe(50_000);
    expect(projectFutureValue(50_000, 12, -1)).toBe(50_000);
  });

  it("handles a negative rate (declining value)", () => {
    expect(projectFutureValue(100_000, -10, 1)).toBeCloseTo(90_000, 0);
  });
});
