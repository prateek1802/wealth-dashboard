export const CHART_PERIODS = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "All"] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export function periodToDays(period: ChartPeriod): number | null {
  switch (period) {
    case "1M": return 30;
    case "3M": return 90;
    case "6M": return 182;
    case "1Y": return 365;
    case "3Y": return 365 * 3;
    case "5Y": return 365 * 5;
    case "All": return null;
  }
}
