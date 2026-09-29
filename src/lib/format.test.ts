import { describe, expect, it } from "vitest";
import { formatNumber } from "./format";

describe("formatNumber", () => {
  it("groups thousands with a comma", () => {
    expect(formatNumber(2000)).toBe("2,000");
  });

  it("leaves numbers below 1,000 unchanged", () => {
    expect(formatNumber(150)).toBe("150");
  });

  it("keeps decimals", () => {
    expect(formatNumber(247.5)).toBe("247.5");
  });
});
