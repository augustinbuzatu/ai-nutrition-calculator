import { describe, expect, it } from "vitest";
import { checkNutritionFacts } from "./check";
import type { NutritionFacts } from "./schemas";

const per100g = (nutrients: NutritionFacts["nutrients"]): NutritionFacts => ({
  basis: "per100g",
  nutrients,
});

const chickenBreast = per100g({
  kcal: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
});

describe("checkNutritionFacts", () => {
  describe("accepts real foods", () => {
    it.each([
      ["chicken breast", chickenBreast],
      ["olive oil", per100g({ kcal: 884, proteinG: 0, carbsG: 0, fatG: 100 })],
      // Fibre makes macros overshoot a little; the 10 kcal floor absorbs it.
      [
        "broccoli",
        per100g({ kcal: 34, proteinG: 2.8, carbsG: 6.6, fatG: 0.4 }),
      ],
      ["water", per100g({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })],
    ])("%s", (_name, facts) => {
      expect(checkNutritionFacts(facts)).toEqual([]);
    });
  });

  it("warns when kcal do not match the macros (here kJ were copied as kcal)", () => {
    const facts = per100g({ ...chickenBreast.nutrients, kcal: 690 });
    expect(checkNutritionFacts(facts)).toEqual([
      {
        severity: "warning",
        code: "energy-mismatch",
        publishedKcal: 690,
        expectedKcal: 156.4,
      },
    ]);
  });

  it("warns about alcoholic drinks, whose alcohol energy is not in the macros", () => {
    const beer: NutritionFacts = {
      basis: "per100ml",
      nutrients: { kcal: 43, proteinG: 0.5, carbsG: 3.6, fatG: 0 },
    };
    expect(checkNutritionFacts(beer)).toEqual([
      expect.objectContaining({ code: "energy-mismatch" }),
    ]);
  });

  it("rejects more energy than pure fat can hold", () => {
    const facts = per100g({ kcal: 1200, proteinG: 0, carbsG: 0, fatG: 100 });
    expect(checkNutritionFacts(facts)).toContainEqual({
      severity: "error",
      code: "impossible-energy",
      kcalPer100g: 1200,
    });
  });

  it("rejects macros that weigh more than the food", () => {
    const facts = per100g({ kcal: 480, proteinG: 120, carbsG: 0, fatG: 0 });
    expect(checkNutritionFacts(facts)).toContainEqual({
      severity: "error",
      code: "impossible-macros",
      gramsPer100g: 120,
    });
  });

  it("checks per-serving facts per 100 g when the serving weight is known", () => {
    // 600 kcal in a 50 g serving would be 1,200 kcal per 100 g.
    const facts: NutritionFacts = {
      basis: "perServing",
      nutrients: { kcal: 600, proteinG: 0, carbsG: 0, fatG: 66 },
      serving: { label: "1 bar", grams: 50 },
    };
    const codes = checkNutritionFacts(facts).map((issue) => issue.code);
    expect(codes).toEqual(["impossible-energy", "impossible-macros"]);
  });

  it("skips weight limits per 100 ml, where the weight is unknown", () => {
    // 100 ml of honey weighs about 140 g, so 117 g of carbs per 100 ml is real.
    const honey: NutritionFacts = {
      basis: "per100ml",
      nutrients: { kcal: 432, proteinG: 0.4, carbsG: 117, fatG: 0 },
    };
    expect(checkNutritionFacts(honey)).toEqual([]);
  });
});
