// Helpers for reading what people type and choose in forms. Plain functions,
// no Zod, so client components can use them without shipping a library.

/**
 * A number field as typed: a value, nothing yet, something that is not a
 * number, or "1,500", which could mean 1500 or 1.5.
 */
export type NumberInput = number | "empty" | "invalid" | "ambiguous";

/**
 * Reads a whole number ("150") or a decimal ("72.5", or "72,5" as written in
 * Romania). Stricter than Number(), which accepts "1e3", "0x10" and " ".
 */
export function parseNumberInput(
  text: string,
  kind: "whole" | "decimal",
): NumberInput {
  const trimmed = text.trim();
  if (trimmed === "") return "empty";
  // A comma followed by exactly three digits may be a thousands separator
  // ("1,200" kcal) or a decimal comma: guessing either way could be off by 1000x.
  if (kind === "decimal" && /^[1-9]\d{0,2},\d{3}$/.test(trimmed)) {
    return "ambiguous";
  }
  const pattern = kind === "whole" ? /^\d+$/ : /^\d+([.,]\d+)?$/;
  if (!pattern.test(trimmed)) return "invalid";
  return Number(trimmed.replace(",", "."));
}

/** Object.hasOwn, not `in`: "toString" in {} is true, inherited from Object. */
export function isKeyOf<T extends object>(
  value: string,
  object: T,
): value is Extract<keyof T, string> {
  return Object.hasOwn(object, value);
}
