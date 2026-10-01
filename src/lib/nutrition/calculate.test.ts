import { describe, expect, it } from "vitest";
import { calculateNutrients, roundNutrients } from "./calculate";
import type { Nutrients, NutritionFacts, Quantity } from "./schemas";

// Typical published values, rounded. Only the arithmetic is under test here.
const chickenBreast: NutritionFacts = {
  basis: "per100g",
  nutrients: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
};
const cookedRice: NutritionFacts = {
  basis: "per100g",
  nutrients: { kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 },
};
const chickenStrips: NutritionFacts = {
  basis: "per100g",
  nutrients: { kcal: 260, proteinG: 18, carbsG: 14, fatG: 15 },
  serving: { label: "1 strip", grams: 40 },
};
const cola: NutritionFacts = {
  basis: "per100ml",
  nutrients: { kcal: 42, proteinG: 0, carbsG: 10.6, fatG: 0 },
  serving: { label: "1 can", ml: 330 },
};
const burger: NutritionFacts = {
  basis: "perServing",
  nutrients: { kcal: 495, proteinG: 26, carbsG: 45, fatG: 23 },
  serving: { label: "1 burger", grams: 210 },
};

/** Calculates and rounds for display, failing the test on a calculation error. */
function calculate(facts: NutritionFacts, quantity: Quantity): Nutrients {
  const result = calculateNutrients(facts, quantity);
  if (!result.ok) throw new Error(`Unexpected error: ${result.error.code}`);
  return roundNutrients(result.nutrients);
}

describe("calculateNutrients", () => {
  it("scales per-100 g values to the grams eaten", () => {
    expect(calculate(chickenBreast, { amount: 150, unit: "g" })).toEqual({
      kcal: 248,
      proteinG: 46.5,
      carbsG: 0,
      fatG: 5.4,
    });
  });

  it("keeps full precision and leaves rounding to the caller", () => {
    const result = calculateNutrients(chickenBreast, {
      amount: 150,
      unit: "g",
    });
    expect(result.ok && result.nutrients.kcal).toBe(247.5);
  });

  it("converts kilograms to grams", () => {
    expect(calculate(cookedRice, { amount: 0.2, unit: "kg" })).toEqual({
      kcal: 260,
      proteinG: 5.4,
      carbsG: 56.4,
      fatG: 0.6,
    });
  });

  it("turns servings into grams with the serving weight", () => {
    // 3 strips x 40 g = 120 g
    expect(calculate(chickenStrips, { amount: 3, unit: "serving" })).toEqual({
      kcal: 312,
      proteinG: 21.6,
      carbsG: 16.8,
      fatG: 18,
    });
  });

  it("gives the same result for 1 can, 330 ml and 0.33 l of a drink", () => {
    const expected = { kcal: 139, proteinG: 0, carbsG: 35, fatG: 0 };
    expect(calculate(cola, { amount: 1, unit: "serving" })).toEqual(expected);
    expect(calculate(cola, { amount: 330, unit: "ml" })).toEqual(expected);
    expect(calculate(cola, { amount: 0.33, unit: "l" })).toEqual(expected);
  });

  it("multiplies per-serving values by the number of servings", () => {
    expect(calculate(burger, { amount: 2, unit: "serving" })).toEqual({
      kcal: 990,
      proteinG: 52,
      carbsG: 90,
      fatG: 46,
    });
  });

  it("turns grams into servings with the serving weight", () => {
    // 105 g of a 210 g burger is half a burger.
    expect(calculate(burger, { amount: 105, unit: "g" })).toEqual({
      kcal: 248,
      proteinG: 13,
      carbsG: 22.5,
      fatG: 11.5,
    });
  });

  describe("returns an error instead of guessing", () => {
    it("when servings are eaten but the serving weight is unknown", () => {
      expect(
        calculateNutrients(chickenBreast, { amount: 3, unit: "serving" }),
      ).toEqual({
        ok: false,
        error: { code: "missing-serving-size", needs: "grams" },
      });
    });

    it("when a per-serving food is measured in ml but the serving has no volume", () => {
      expect(calculateNutrients(burger, { amount: 250, unit: "ml" })).toEqual({
        ok: false,
        error: { code: "missing-serving-size", needs: "ml" },
      });
    });

    it("when grams are eaten of a drink published per 100 ml", () => {
      expect(calculateNutrients(cola, { amount: 330, unit: "g" })).toEqual({
        ok: false,
        error: { code: "unit-mismatch", eaten: "mass", published: "volume" },
      });
    });

    it("when ml are eaten of a food published per 100 g", () => {
      expect(
        calculateNutrients(chickenBreast, { amount: 100, unit: "ml" }),
      ).toEqual({
        ok: false,
        error: { code: "unit-mismatch", eaten: "volume", published: "mass" },
      });
    });
  });
});
