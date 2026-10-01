import { describe, expect, it } from "vitest";
import { roundTo } from "./math";

describe("roundTo", () => {
  it("rounds halves up", () => {
    expect(roundTo(247.5, 0)).toBe(248);
    expect(roundTo(46.25, 1)).toBe(46.3);
  });

  it("is not thrown off by binary floating point", () => {
    // Math.round(1.005 * 100) / 100 gives 1.
    expect(roundTo(1.005, 2)).toBe(1.01);
    // (1.45).toFixed(1) gives "1.4".
    expect(roundTo(1.45, 1)).toBe(1.5);
    // 0.1 + 0.2 is 0.30000000000000004.
    expect(roundTo(0.1 + 0.2, 1)).toBe(0.3);
  });

  it("leaves values that already fit unchanged", () => {
    expect(roundTo(46.5, 1)).toBe(46.5);
    expect(roundTo(0, 1)).toBe(0);
  });

  it("handles numbers written with an exponent", () => {
    expect(roundTo(1e-7, 1)).toBe(0);
  });
});
