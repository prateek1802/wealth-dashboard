import { describe, it, expect } from "vitest";
import { parseMFAPIHistoryResponse, parseYahooChartHistoryResponse, parseCoinGeckoRangeResponse } from "@/lib/market-data/historical-provider";

describe("parseMFAPIHistoryResponse", () => {
  it("parses a real mfapi.in response shape (DD-MM-YYYY dates, string NAVs)", () => {
    const fixture = {
      meta: { fund_house: "SBI Mutual Fund", scheme_code: 125497 },
      data: [
        { date: "29-12-2023", nav: "161.23570" },
        { date: "28-12-2023", nav: "159.96250" },
      ],
      status: "SUCCESS",
    };
    expect(parseMFAPIHistoryResponse(fixture)).toEqual([
      { date: "2023-12-29", price: 161.2357 },
      { date: "2023-12-28", price: 159.9625 },
    ]);
  });

  it("skips unparseable rows instead of failing the whole batch", () => {
    const fixture = { data: [{ date: "29-12-2023", nav: "161.23570" }, { date: "not-a-date", nav: "100" }, { date: "28-12-2023", nav: "not-a-number" }] };
    expect(parseMFAPIHistoryResponse(fixture)).toEqual([{ date: "2023-12-29", price: 161.2357 }]);
  });

  it("returns [] for a missing or malformed data array", () => {
    expect(parseMFAPIHistoryResponse({})).toEqual([]);
    expect(parseMFAPIHistoryResponse({ data: "not an array" })).toEqual([]);
    expect(parseMFAPIHistoryResponse(null)).toEqual([]);
  });
});

describe("parseYahooChartHistoryResponse", () => {
  it("zips timestamp[] and close[] into date/price points", () => {
    const fixture = {
      chart: {
        result: [
          {
            timestamp: [1701216600, 1701303000],
            indicators: { quote: [{ close: [150.5, 151.25] }] },
          },
        ],
      },
    };
    const points = parseYahooChartHistoryResponse(fixture);
    expect(points).toHaveLength(2);
    expect(points[0].price).toBe(150.5);
    expect(points[1].price).toBe(151.25);
    // Just check these parse to valid ISO dates, not exact values — timezone
    // conversion from a unix timestamp shouldn't be pinned to one offset.
    expect(points[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("skips days with a null close (holidays/gaps) rather than fabricating one", () => {
    const fixture = {
      chart: { result: [{ timestamp: [1701216600, 1701303000], indicators: { quote: [{ close: [150.5, null] }] } }] },
    };
    expect(parseYahooChartHistoryResponse(fixture)).toHaveLength(1);
  });

  it("returns [] when the expected arrays are missing", () => {
    expect(parseYahooChartHistoryResponse({ chart: { result: [] } })).toEqual([]);
    expect(parseYahooChartHistoryResponse({})).toEqual([]);
  });
});

describe("parseCoinGeckoRangeResponse", () => {
  it("converts [ms, price] pairs into date/price points", () => {
    const fixture = { prices: [[1701216600000, 37250.5], [1701303000000, 37500.1]] };
    const points = parseCoinGeckoRangeResponse(fixture);
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.price)).toEqual([37250.5, 37500.1]);
  });

  it("dedupes same-day points, keeping the last one (closest to that day's close)", () => {
    // Both timestamps fall on the same UTC calendar day.
    const fixture = { prices: [[1701216600000, 100], [1701219600000, 105]] };
    const points = parseCoinGeckoRangeResponse(fixture);
    expect(points).toHaveLength(1);
    expect(points[0].price).toBe(105);
  });

  it("returns [] for a missing or malformed prices array", () => {
    expect(parseCoinGeckoRangeResponse({})).toEqual([]);
    expect(parseCoinGeckoRangeResponse({ prices: "nope" })).toEqual([]);
  });
});
