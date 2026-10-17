import { describe, expect, it } from "vitest";
import {
  type Meal,
  type MealFields,
  checkMeal,
  parseMeal,
  parseMealEdit,
  rescaleNutrients,
} from "./form";

const chicken: MealFields = {
  name: " Chicken breast ",
  basis: "per100g",
  servingLabel: "",
  kcal: "165",
  proteinG: "31",
  carbsG: "0",
  fatG: "3,6",
  amount: "150",
  unit: "g",
};

const burger: MealFields = {
  name: "Burger",
  basis: "perServing",
  servingLabel: "1 burger",
  kcal: "495",
  proteinG: "26",
  carbsG: "45",
  fatG: "23",
  amount: "2",
  unit: "serving",
};

function parsed(fields: MealFields): Meal {
  const result = parseMeal(fields);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.meal;
}

describe("parseMeal", () => {
  it("turns the fields into nutrition facts and a quantity", () => {
    expect(parsed(chicken)).toEqual({
      name: "Chicken breast",
      facts: {
        basis: "per100g",
        nutrients: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
      },
      quantity: { amount: 150, unit: "g" },
    });
  });

  it("keeps what a serving is, for values given per serving", () => {
    expect(parsed(burger).facts).toEqual({
      basis: "perServing",
      nutrients: { kcal: 495, proteinG: 26, carbsG: 45, fatG: 23 },
      serving: { label: "1 burger" },
    });
  });

  it("explains every empty field", () => {
    const empty = {
      ...chicken,
      name: "",
      kcal: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
      amount: "",
    };
    expect(parseMeal(empty)).toEqual({
      ok: false,
      errors: {
        name: "Enter what you ate.",
        kcal: "Enter a number, 0 if the label has none.",
        proteinG: "Enter a number, 0 if the label has none.",
        carbsG: "Enter a number, 0 if the label has none.",
        fatG: "Enter a number, 0 if the label has none.",
        amount: "Enter how much you ate.",
      },
    });
  });

  it("asks what a serving is when values are per serving", () => {
    expect(parseMeal({ ...burger, servingLabel: " " })).toEqual({
      ok: false,
      errors: { servingLabel: "Say what one serving is, like “1 burger”." },
    });
  });

  it("only accepts units that fit how the values are given", () => {
    // Servings of a food labelled per 100 g would need the serving's weight.
    expect(parseMeal({ ...chicken, unit: "serving" })).toEqual({
      ok: false,
      errors: { unit: "Choose a unit." },
    });
  });

  it("refuses to guess whether 1,200 means twelve hundred or 1.2", () => {
    expect(parseMeal({ ...burger, kcal: "1,200" })).toEqual({
      ok: false,
      errors: { kcal: "Write 1200 or 1.2: “1,200” could mean either." },
    });
  });

  it("needs an amount above 0", () => {
    expect(parseMeal({ ...chicken, amount: "0" })).toEqual({
      ok: false,
      errors: { amount: "Enter an amount above 0." },
    });
  });
});

describe("checkMeal", () => {
  it("works out what the meal adds, unrounded", () => {
    expect(checkMeal(parsed(chicken))).toEqual({
      ok: true,
      nutrients: { kcal: 247.5, proteinG: 46.5, carbsG: 0, fatG: 5.4 },
      warning: null,
    });
  });

  it("multiplies values per serving by the servings eaten", () => {
    const result = checkMeal(parsed(burger));
    expect(result.ok && result.nutrients.kcal).toBe(990);
  });

  it("blocks energy no food can have, a typical kJ mix-up", () => {
    expect(checkMeal(parsed({ ...chicken, kcal: "690", fatG: "3.6" })).ok).toBe(
      true,
    );
    expect(checkMeal(parsed({ ...chicken, kcal: "2000" }))).toEqual({
      ok: false,
      error:
        "No food has more than 950 kcal per 100 g, and this is 2,000. Is it the kJ value?",
    });
  });

  it("warns, without blocking, when the calories do not match the macros", () => {
    // 31 g protein and 3.6 g fat suggest 4 × 31 + 9 × 3.6 = 156.4 kcal, far from 100.
    const result = checkMeal(parsed({ ...chicken, kcal: "100" }));
    expect(result).toMatchObject({
      ok: true,
      warning: "The macros suggest about 156 kcal, not 100. Check the label.",
    });
  });
});

describe("editing a meal", () => {
  it("checks the new name and amount", () => {
    expect(parseMealEdit({ name: " Rice ", amount: "200" })).toEqual({
      ok: true,
      name: "Rice",
      amount: 200,
    });
    expect(parseMealEdit({ name: "", amount: "-1" })).toEqual({
      ok: false,
      errors: {
        name: "Enter what you ate.",
        amount: "Enter a number, like 150.",
      },
    });
  });

  it("scales the saved nutrients to the new amount", () => {
    const for150g = { kcal: 247.5, proteinG: 46.5, carbsG: 0, fatG: 5.4 };
    expect(rescaleNutrients(for150g, 150, 300)).toEqual({
      kcal: 495,
      proteinG: 93,
      carbsG: 0,
      fatG: 10.8,
    });
  });
});
