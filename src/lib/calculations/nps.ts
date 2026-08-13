import type { NPSProjectionPoint } from "@/types/domain/nps";

/**
 * Year-by-year NPS corpus projection. Clearly an ESTIMATE — the UI is
 * responsible for labeling this as an assumption-driven projection, not a
 * guaranteed outcome (see FINANCIAL SAFETY requirements).
 */
export function projectNPSCorpus(params: {
  currentCorpus: number;
  monthlyContribution: number;
  annualContributionIncreasePercent: number;
  years: number;
  expectedAnnualReturnPercent: number;
}): NPSProjectionPoint[] {
  const { currentCorpus, monthlyContribution, annualContributionIncreasePercent, years, expectedAnnualReturnPercent } = params;

  const monthlyRate = expectedAnnualReturnPercent / 100 / 12;
  const points: NPSProjectionPoint[] = [];

  let corpus = currentCorpus;
  let currentMonthlyContribution = monthlyContribution;
  const currentYear = new Date().getFullYear();

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      corpus = corpus * (1 + monthlyRate) + currentMonthlyContribution;
    }
    currentMonthlyContribution *= 1 + annualContributionIncreasePercent / 100;
    points.push({ year: currentYear + year, corpus: Math.round(corpus) });
  }

  return points;
}
