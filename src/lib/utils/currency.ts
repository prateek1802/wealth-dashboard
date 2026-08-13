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
