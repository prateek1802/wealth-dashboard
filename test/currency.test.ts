import { describe, it, expect } from "vitest";
import { formatQuantity } from "@/lib/utils/currency";

describe("formatQuantity", () => {
  it("reproduces and fixes the exact reported bug: a floating-point-noisy MF unit count", () => {
    // From the real bug report — this is what a naive `qty + qty + ...`
    // reduction in JS floating point actually produced, and what broke the
    // card/table layout when rendered raw.
    expect(formatQuantity(1876.2259999999989)).toBe("1,876.226");
    expect(formatQuantity(2189.409000000001)).toBe("2,189.409");
  });

  it("shows whole numbers with no decimal places at all (typical stock quantity)", () => {
    expect(formatQuantity(10)).toBe("10");
    expect(formatQuantity(1500)).toBe("1,500");
  });

  it("never shows more than the requested number of decimal places", () => {
    expect(formatQuantity(1.123456789, 4)).toBe("1.1235"); // rounds, doesn't truncate
    expect(formatQuantity(1.123456789, 2)).toBe("1.12");
  });

  it("trims unnecessary trailing zeros rather than padding to the max", () => {
    expect(formatQuantity(5.5)).toBe("5.5");
    expect(formatQuantity(5.5, 4)).toBe("5.5"); // NOT "5.5000"
  });

  it("does not touch the underlying number — this is a display-only concern", () => {
    const raw = 1876.2259999999989;
    formatQuantity(raw);
    expect(raw).toBe(1876.2259999999989); // unchanged
  });
});
