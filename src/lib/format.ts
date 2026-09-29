const numberFormat = new Intl.NumberFormat("en-US");

/** Formats a number for display, e.g. 2000 -> "2,000". */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
