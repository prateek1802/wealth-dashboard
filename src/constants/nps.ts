export const NPS_TIERS = ["Tier I", "Tier II"] as const;
export type NPSTier = (typeof NPS_TIERS)[number];

/** The 10 PFRDA-registered Pension Fund Managers (pfrda.org.in) as of the app's last check. */
export const PENSION_FUND_MANAGERS = [
  "SBI Pension Fund",
  "LIC Pension Fund",
  "UTI Retirement Solutions",
  "HDFC Pension Fund",
  "ICICI Prudential Pension Fund",
  "Kotak Mahindra Pension Fund",
  "Aditya Birla Sun Life Pension Management",
  "Tata Pension Management",
  "Axis Pension Fund Management",
  "Max Life Pension Fund Management",
] as const;
export type PensionFundManager = (typeof PENSION_FUND_MANAGERS)[number];

/**
 * Scheme preference under NPS: Active Choice lets the subscriber set their
 * own E/C/G/A split; Auto Choice glides the mix by age via a lifecycle fund
 * (Aggressive/Moderate/Conservative = LC75/LC50/LC25). PFRDA has since
 * folded these into a broader "Common Schemes" framework, but this is
 * still the terminology on most subscribers' own PRAN statements.
 */
export const NPS_SCHEME_PREFERENCES = [
  "Active Choice",
  "Auto Choice — Aggressive (LC75)",
  "Auto Choice — Moderate (LC50)",
  "Auto Choice — Conservative (LC25)",
] as const;
export type NPSSchemePreference = (typeof NPS_SCHEME_PREFERENCES)[number];
