/**
 * Rounds to `decimals` places, halves rounding up.
 *
 * Multiplying first would bring in binary floating-point error:
 * `Math.round(1.005 * 100) / 100` gives 1, because 1.005 * 100 is 100.49999999999999.
 * Moving the decimal point through the exponent ("1.005e2") keeps the exact digits.
 */
export function roundTo(value: number, decimals: number): number {
  const rounded = Math.round(shiftDecimalPoint(value, decimals));
  return shiftDecimalPoint(rounded, -decimals);
}

/** Moves the decimal point by editing the exponent of the number's text form. */
function shiftDecimalPoint(value: number, places: number): number {
  // String(1e-7) is "1e-7", so a number can already carry an exponent.
  const [mantissa, exponent = "0"] = String(value).split("e");
  return Number(`${mantissa}e${Number(exponent) + places}`);
}
