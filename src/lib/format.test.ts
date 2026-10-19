import { describe, expect, it } from "vitest";
import { formatNumber, formatNutrient, formatQuantity } from "./format";

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

  it("shows at most 3 decimals, which hides floating-point noise", () => {
    expect(formatNumber(150 - 86.1)).toBe("63.9"); // 63.900000000000006
  });
});

describe("formatQuantity", () => {
  it("puts the unit after the amount", () => {
    expect(formatQuantity(150, "g")).toBe("150 g");
    expect(formatQuantity(0.5, "l")).toBe("0.5 l");
  });

  it("writes servings in words, singular or plural", () => {
    expect(formatQuantity(1, "serving")).toBe("1 serving");
    expect(formatQuantity(2, "serving")).toBe("2 servings");
    expect(formatQuantity(0.5, "serving")).toBe("0.5 servings");
  });
});

describe("formatNutrient", () => {
  it("joins the value, unit and name with non-breaking spaces", () => {
    expect(formatNutrient(3.6, "g", "fat")).toBe("3.6\u00a0g\u00a0fat");
    expect(formatNutrient(1247.5, "kcal")).toBe("1,247.5\u00a0kcal");
  });

  it("keeps a zero", () => {
    expect(formatNutrient(0, "g", "carbs")).toBe("0\u00a0g\u00a0carbs");
  });
});
