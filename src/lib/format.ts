import type { Unit } from "@/lib/nutrition/schemas";

// At most 3 decimals (the Intl default), which also hides floating-point
// noise: 150 - 86.1 is 63.900000000000006 and shows as "63.9".
const numberFormat = new Intl.NumberFormat("en-US");

/** Formats a number for display, e.g. 2000 -> "2,000". */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** "150 g", "0.5 l", "1 serving", "2 servings". */
export function formatQuantity(amount: number, unit: Unit): string {
  if (unit === "serving") {
    return `${formatNumber(amount)} ${amount === 1 ? "serving" : "servings"}`;
  }
  return `${formatNumber(amount)} ${unit}`;
}
