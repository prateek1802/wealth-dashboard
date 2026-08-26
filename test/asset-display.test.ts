import { describe, it, expect } from "vitest";
import { isMutualFundType, getAssetDisplayLabel, quantityLabel, avgPriceLabel, currentPriceLabel } from "@/lib/utils/asset-display";

describe("isMutualFundType", () => {
  it("is true for both mutual fund variants", () => {
    expect(isMutualFundType("mutual_fund")).toBe(true);
    expect(isMutualFundType("mutual_fund_debt")).toBe(true);
  });

  it("is false for every other asset type", () => {
    expect(isMutualFundType("stock_in")).toBe(false);
    expect(isMutualFundType("stock_us")).toBe(false);
    expect(isMutualFundType("etf")).toBe(false);
    expect(isMutualFundType("crypto")).toBe(false);
    expect(isMutualFundType("bond")).toBe(false);
    expect(isMutualFundType("cash")).toBe(false);
    expect(isMutualFundType("other")).toBe(false);
  });
});

describe("quantityLabel / avgPriceLabel / currentPriceLabel", () => {
  it("use MF (NAV/units) terminology for mutual funds", () => {
    expect(quantityLabel("mutual_fund")).toBe("Units");
    expect(avgPriceLabel("mutual_fund_debt")).toBe("Avg. NAV");
    expect(currentPriceLabel("mutual_fund")).toBe("Present NAV");
  });

  it("use stock-style terminology for everything else", () => {
    expect(quantityLabel("stock_in")).toBe("Qty");
    expect(avgPriceLabel("crypto")).toBe("Avg. Cost");
    expect(currentPriceLabel("etf")).toBe("Current Price");
  });
});

describe("getAssetDisplayLabel", () => {
  it("shows the scheme name as primary for mutual funds (scheme code is meaningless to a human)", () => {
    const result = getAssetDisplayLabel({ assetType: "mutual_fund", symbol: "120716", name: "Parag Parikh Flexi Cap Fund" });
    expect(result).toEqual({ primary: "Parag Parikh Flexi Cap Fund", secondary: "120716" });
  });

  it("shows the symbol as primary for stocks", () => {
    const result = getAssetDisplayLabel({ assetType: "stock_in", symbol: "TCS", name: "Tata Consultancy Services" });
    expect(result).toEqual({ primary: "TCS", secondary: "Tata Consultancy Services" });
  });
});
