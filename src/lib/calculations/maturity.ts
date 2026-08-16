/** Days from now until a given ISO date — negative if it's already passed. Shared by every reminder type (FD already had its own copy in fd.ts; this generalizes it). */
export function calculateDaysUntil(dateISO: string, asOf: Date = new Date()): number {
  const target = new Date(dateISO);
  const diffMs = target.getTime() - asOf.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * PPF's actual maturity rule: 15 financial years from the account's
 * opening date (extendable in blocks of 5 years after that, which this
 * app doesn't model — it's just the initial maturity milestone, not a
 * hard close-out date).
 */
export function calculatePPFMaturityDate(openDateISO: string): string {
  const open = new Date(openDateISO);
  const maturity = new Date(open);
  maturity.setFullYear(maturity.getFullYear() + 15);
  return maturity.toISOString().slice(0, 10);
}
