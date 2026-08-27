const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, maximumFractionDigits: number) {
  const key = `${currency}:${maximumFractionDigits}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits,
        minimumFractionDigits: 0,
      })
    );
  }
  return formatterCache.get(key)!;
}

const quantityFormatterCache = new Map<number, Intl.NumberFormat>();

function getQuantityFormatter(maximumFractionDigits: number) {
  if (!quantityFormatterCache.has(maximumFractionDigits)) {
    quantityFormatterCache.set(maximumFractionDigits, new Intl.NumberFormat("en-IN", { maximumFractionDigits, minimumFractionDigits: 0 }));
  }
  return quantityFormatterCache.get(maximumFractionDigits)!;
}

/**
 * Formats a quantity/units value for DISPLAY ONLY — rounds to at most
 * `maximumFractionDigits` (default 4, matching this app's established
 * numeric(18,4) precision for unit-based quantities elsewhere, e.g. NPS
 * scheme holdings) and trims unnecessary trailing zeros. Never changes the
 * underlying stored/computed number, which keeps its full precision for
 * actual P&L/XIRR math.
 *
 * Exists because summing many transaction quantities in JS floating point
 * (e.g. buying mutual fund units at a fractional NAV, or FIFO lot
 * arithmetic) accumulates representation error that renders as something
 * like "1876.2259999999989" instead of "1876.226" if shown raw — harmless
 * to the math, but broke card/table layouts and looked like a data bug.
 */
export function formatQuantity(value: number, maximumFractionDigits: number = 4): string {
  return getQuantityFormatter(maximumFractionDigits).format(value);
}

export function formatCurrency(value: number, currency: string = "INR"): string {
  return getFormatter(currency, 0).format(value);
}

export function formatCurrencyPrecise(value: number, currency: string = "INR"): string {
  return getFormatter(currency, 2).format(value);
}

export function formatPercent(value: number, fractionDigits: number = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatSignedCurrency(value: number, currency: string = "INR"): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}
