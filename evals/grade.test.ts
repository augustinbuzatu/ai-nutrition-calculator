import { describe, expect, it } from "vitest";
import type { MealFields } from "@/lib/meals/form";
import type { ParseResult } from "@/lib/parser/parse";
import { type EvalCase, gradeCase } from "./grade";

const chickenCase: EvalCase = {
  description: "150 g piept de pui",
  why: "test",
  foods: [
    {
      name: /pui|chicken/,
      amount: { value: 150, unit: "g" },
      kcal: [210, 285],
      proteinG: [40, 52],
    },
  ],
};

const chicken: MealFields = {
  name: "Piept de pui",
  basis: "per100g",
  servingLabel: "",
  kcal: "165",
  proteinG: "31",
  carbsG: "0",
  fatG: "3.6",
  amount: "150",
  unit: "g",
};

const found = (...fields: MealFields[]): ParseResult => ({
  ok: true,
  meals: fields.map((f) => ({ fields: f, note: null })),
});

describe("gradeCase", () => {
  it("passes an answer in range, and describes what was found", () => {
    expect(gradeCase(chickenCase, found(chicken))).toEqual({
      failures: [],
      found: ["Piept de pui: 150 g, 248 kcal, 46.5 g protein"],
    });
  });

  it("matches names without their diacritics", () => {
    const bread: EvalCase = {
      ...chickenCase,
      foods: [{ name: /paine/, kcal: [0, 1000], proteinG: [0, 100] }],
    };
    expect(
      gradeCase(bread, found({ ...chicken, name: "Pâine integrală" })),
    ).toMatchObject({ failures: [] });
  });

  it("treats 0.15 kg as 150 g", () => {
    expect(
      gradeCase(chickenCase, found({ ...chicken, amount: "0.15", unit: "kg" })),
    ).toMatchObject({ failures: [] });
  });

  it("reports a wrong amount, kcal and protein", () => {
    expect(
      gradeCase(chickenCase, found({ ...chicken, amount: "100" })).failures,
    ).toEqual([
      "Piept de pui: 100 g, expected 150 g",
      "Piept de pui: 165 kcal, expected 210–285",
      "Piept de pui: 31 g protein, expected 40–52",
    ]);
  });

  it("reports values above the range", () => {
    expect(
      gradeCase(chickenCase, found({ ...chicken, kcal: "330", proteinG: "62" }))
        .failures,
    ).toEqual([
      "Piept de pui: 495 kcal, expected 210–285",
      "Piept de pui: 93 g protein, expected 40–52",
    ]);
  });

  it("reports millilitres where grams were given", () => {
    expect(
      gradeCase(
        chickenCase,
        found({ ...chicken, basis: "per100ml", unit: "ml" }),
      ).failures,
    ).toEqual(["Piept de pui: 150 ml, expected 150 g"]);
  });

  it("reports grams where servings were counted", () => {
    const eggs: EvalCase = {
      ...chickenCase,
      foods: [
        { ...chickenCase.foods[0], amount: { value: 2, unit: "serving" } },
      ],
    };
    expect(gradeCase(eggs, found(chicken)).failures).toEqual([
      "Piept de pui: 150 g, expected 2 servings",
    ]);
  });

  it("reports servings where grams were given", () => {
    expect(
      gradeCase(
        chickenCase,
        found({
          ...chicken,
          basis: "perServing",
          servingLabel: "1 piece",
          kcal: "248",
          proteinG: "46.5",
          amount: "1",
          unit: "serving",
        }),
      ).failures,
    ).toEqual(["Piept de pui: 1 serving, expected 150 g"]);
  });

  it("reports missing, extra and unnamed foods", () => {
    expect(
      gradeCase(chickenCase, found({ ...chicken, name: "Orez" }, chicken))
        .failures,
    ).toEqual(["expected 1 food, found 2"]);
    expect(
      gradeCase(chickenCase, found({ ...chicken, name: "Orez" })).failures,
    ).toEqual(["no food named like /pui|chicken/"]);
  });

  it("matches each found food once", () => {
    const twoChickens: EvalCase = {
      ...chickenCase,
      foods: [chickenCase.foods[0], chickenCase.foods[0]],
    };
    expect(gradeCase(twoChickens, found(chicken)).failures).toEqual([
      "expected 2 foods, found 1",
      "no food named like /pui|chicken/",
    ]);
  });

  it("reports what the form or the checks reject", () => {
    expect(
      gradeCase(
        chickenCase,
        found({
          ...chicken,
          servingLabel: "",
          basis: "perServing",
          unit: "serving",
        }),
      ).failures,
    ).toEqual([
      "Piept de pui: the form rejects it (Say what one serving is, like “1 burger”.)",
    ]);
    expect(
      gradeCase(chickenCase, found({ ...chicken, kcal: "2250" })).failures,
    ).toEqual([
      "Piept de pui: No food has more than 950 kcal per 100 g, and this is 2,250. Is it the kJ value?",
    ]);
  });

  it("reports a parser failure", () => {
    expect(
      gradeCase(chickenCase, {
        ok: false,
        error: "Your meal could not be read.",
      }),
    ).toEqual({
      failures: ["the parser failed: Your meal could not be read."],
      found: [],
    });
  });

  it("expects an error when there is no food", () => {
    const noFood: EvalCase = { description: "hi", why: "test", foods: [] };
    expect(gradeCase(noFood, { ok: false, error: "No food." })).toEqual({
      failures: [],
      found: [],
    });
    expect(gradeCase(noFood, found(chicken)).failures).toEqual([
      "expected no food, found 1",
    ]);
  });
});
