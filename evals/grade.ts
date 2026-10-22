import { formatNumber, formatQuantity } from "@/lib/format";
import { checkMeal, parseMeal } from "@/lib/meals/form";
import type { Quantity } from "@/lib/nutrition/schemas";
import type { ParsedMeal, ParseResult } from "@/lib/parser/parse";

/** A food the parser should find, and what it should add. */
export type ExpectedFood = {
  /** Tested against the name without diacritics, so "oua" matches "Ouă". */
  name: RegExp;
  /** Checked only when the description states it. */
  amount?: { value: number; unit: "g" | "ml" | "serving" };
  /**
   * What the food adds, as a range wide enough for normal recipes and
   * portions: the eval catches gross errors (kJ, raw for cooked, a portion
   * counted twice), not a few percent.
   */
  kcal: [number, number];
  proteinG: [number, number];
};

export type EvalCase = {
  description: string;
  /** What the case checks. */
  why: string;
  /** No foods: the parser must say it found none. */
  foods: ExpectedFood[];
};

export type Grade = {
  /** Every way the answer misses; empty when the case passes. */
  failures: string[];
  /** What the parser found, one line per food, for the report. */
  found: string[];
};

/**
 * Grades the parser's answer the way the app would use it: through the meal
 * form's rules and the calculator, so what counts is what the food adds.
 */
export function gradeCase(testCase: EvalCase, result: ParseResult): Grade {
  if (testCase.foods.length === 0) {
    return result.ok
      ? {
          failures: [`expected no food, found ${result.meals.length}`],
          found: result.meals.map(describeMeal),
        }
      : { failures: [], found: [] };
  }
  if (!result.ok) {
    return { failures: [`the parser failed: ${result.error}`], found: [] };
  }

  const failures: string[] = [];
  if (result.meals.length !== testCase.foods.length) {
    failures.push(
      `expected ${count(testCase.foods.length)}, found ${result.meals.length}`,
    );
  }

  const unmatched = [...result.meals];
  for (const food of testCase.foods) {
    const index = unmatched.findIndex((meal) =>
      food.name.test(plain(meal.fields.name)),
    );
    if (index === -1) {
      failures.push(`no food named like ${food.name}`);
      continue;
    }
    const [meal] = unmatched.splice(index, 1);
    const name = meal.fields.name;

    const parsed = parseMeal(meal.fields);
    if (!parsed.ok) {
      failures.push(
        `${name}: the form rejects it (${Object.values(parsed.errors).join(" ")})`,
      );
      continue;
    }
    const check = checkMeal(parsed.meal);
    if (!check.ok) {
      failures.push(`${name}: ${check.error}`);
      continue;
    }

    if (food.amount) {
      const actual = inBaseUnit(parsed.meal.quantity);
      if (
        actual.unit !== food.amount.unit ||
        Math.abs(actual.value - food.amount.value) > 0.001 * food.amount.value
      ) {
        failures.push(
          `${name}: ${formatQuantity(actual.value, actual.unit)}, expected ${formatQuantity(food.amount.value, food.amount.unit)}`,
        );
      }
    }

    const { kcal, proteinG } = check.nutrients;
    if (!within(kcal, food.kcal)) {
      failures.push(
        `${name}: ${formatNumber(Math.round(kcal))} kcal, expected ${food.kcal[0]}–${food.kcal[1]}`,
      );
    }
    if (!within(proteinG, food.proteinG)) {
      failures.push(
        `${name}: ${formatNumber(Math.round(proteinG * 10) / 10)} g protein, expected ${food.proteinG[0]}–${food.proteinG[1]}`,
      );
    }
  }

  return { failures, found: result.meals.map(describeMeal) };
}

/** "Piept de pui: 150 g, 248 kcal, 46.5 g protein" */
function describeMeal({ fields }: ParsedMeal): string {
  const parsed = parseMeal(fields);
  if (!parsed.ok) return `${fields.name}: rejected by the form`;
  const check = checkMeal(parsed.meal);
  const quantity = formatQuantity(
    parsed.meal.quantity.amount,
    parsed.meal.quantity.unit,
  );
  if (!check.ok) return `${fields.name}: ${quantity}, ${check.error}`;
  const { kcal, proteinG } = check.nutrients;
  return `${fields.name}: ${quantity}, ${formatNumber(Math.round(kcal))} kcal, ${formatNumber(Math.round(proteinG * 10) / 10)} g protein`;
}

/** 0.5 l and 500 ml are the same amount. */
function inBaseUnit({ amount, unit }: Quantity): {
  value: number;
  unit: "g" | "ml" | "serving";
} {
  switch (unit) {
    case "kg":
      return { value: amount * 1000, unit: "g" };
    case "l":
      return { value: amount * 1000, unit: "ml" };
    default:
      return { value: amount, unit };
  }
}

function count(foods: number): string {
  return foods === 1 ? "1 food" : `${foods} foods`;
}

function within(value: number, [min, max]: [number, number]): boolean {
  return value >= min && value <= max;
}

/** "Ouă fierte" → "oua fierte" */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
