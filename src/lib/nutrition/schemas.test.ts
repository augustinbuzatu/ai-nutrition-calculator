import { describe, expect, it } from "vitest";
import { nutritionFactsSchema, quantitySchema } from "./schemas";

const isValidFacts = (input: unknown) =>
  nutritionFactsSchema.safeParse(input).success;
const isValidQuantity = (input: unknown) =>
  quantitySchema.safeParse(input).success;

const chickenBreast = {
  basis: "per100g",
  nutrients: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
};

describe("nutritionFactsSchema", () => {
  it("accepts facts per 100 g", () => {
    expect(isValidFacts(chickenBreast)).toBe(true);
  });

  it("rejects negative values", () => {
    const nutrients = { ...chickenBreast.nutrients, fatG: -1 };
    expect(isValidFacts({ ...chickenBreast, nutrients })).toBe(false);
  });

  it("rejects per-serving facts that do not say what the serving is", () => {
    expect(isValidFacts({ ...chickenBreast, basis: "perServing" })).toBe(false);
  });
});

describe("quantitySchema", () => {
  it("accepts metric units and servings", () => {
    expect(isValidQuantity({ amount: 0.5, unit: "l" })).toBe(true);
    expect(isValidQuantity({ amount: 3, unit: "serving" })).toBe(true);
  });

  it("rejects units the calculator cannot convert", () => {
    expect(isValidQuantity({ amount: 1, unit: "cup" })).toBe(false);
  });

  it("rejects zero and negative amounts", () => {
    expect(isValidQuantity({ amount: 0, unit: "g" })).toBe(false);
    expect(isValidQuantity({ amount: -50, unit: "g" })).toBe(false);
  });
});
