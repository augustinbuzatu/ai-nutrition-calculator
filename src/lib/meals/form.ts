import { formatNumber } from "@/lib/format";
import { isKeyOf, parseNumberInput } from "@/lib/input";
import { roundTo } from "@/lib/math";
import { calculateNutrients, scaleNutrients } from "@/lib/nutrition/calculate";
import {
  MAX_KCAL_PER_100G,
  type NutritionIssue,
  checkNutritionFacts,
} from "@/lib/nutrition/check";
import type {
  Nutrients,
  NutritionFacts,
  Quantity,
  Unit,
} from "@/lib/nutrition/schemas";

// The meal form's rules, shared by the browser (live preview) and the server
// (the check that counts). Pure functions, no Zod: see src/lib/input.ts.

/** How a label gives its values, and the units that make sense with each. */
export const BASES = {
  per100g: { label: "Per 100 g", units: ["g", "kg"] },
  per100ml: { label: "Per 100 ml", units: ["ml", "l"] },
  perServing: { label: "Per serving", units: ["serving"] },
} as const satisfies Record<
  NutritionFacts["basis"],
  { label: string; units: readonly Unit[] }
>;

/** How units read next to an amount in the forms. */
export const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  serving: "servings",
};

/** Upper bounds that catch typos (and fit the database's numeric(10, 3)). */
export const MEAL_LIMITS = {
  name: 100,
  servingLabel: 50,
  nutrient: 10_000,
  amount: 10_000,
} as const;

/** The form's fields, as typed or chosen. */
export type MealFields = {
  name: string;
  basis: string;
  servingLabel: string;
  kcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  amount: string;
  unit: string;
};

export type MealFieldErrors = Partial<Record<keyof MealFields, string>>;

export type Meal = { name: string; facts: NutritionFacts; quantity: Quantity };

/** The longest meal description the parser reads. */
export const MAX_DESCRIPTION_LENGTH = 500;

/** How many foods the log page saves at once. */
export const MAX_MEALS_PER_SAVE = 20;

/** A food on the log page: its fields, and the description it was read from. */
export type MealDraft = { fields: MealFields; description: string | null };

/** What the log page shows after the server answered. */
export type MealsFormState = { error?: string };

type Read<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseMeal(
  fields: MealFields,
): { ok: true; meal: Meal } | { ok: false; errors: MealFieldErrors } {
  const errors: MealFieldErrors = {};
  const keep = <T>(field: keyof MealFields, read: Read<T>): T | undefined => {
    if (read.ok) return read.value;
    errors[field] = read.error;
  };

  const name = keep("name", readName(fields.name));
  const kcal = keep("kcal", readNutrient(fields.kcal, 165));
  const proteinG = keep("proteinG", readNutrient(fields.proteinG, 31));
  const carbsG = keep("carbsG", readNutrient(fields.carbsG, 0));
  const fatG = keep("fatG", readNutrient(fields.fatG, 3.6));
  const amount = keep("amount", readAmount(fields.amount));

  const basis = isKeyOf(fields.basis, BASES) ? fields.basis : undefined;
  if (!basis) errors.basis = "Choose how the values are given.";
  const units: readonly Unit[] = basis ? BASES[basis].units : [];
  const unit = units.find((u) => u === fields.unit);
  if (basis && !unit) errors.unit = "Choose a unit.";

  const servingLabel = fields.servingLabel.trim();
  if (basis === "perServing") {
    if (servingLabel === "") {
      errors.servingLabel = "Say what one serving is, like “1 burger”.";
    } else if (servingLabel.length > MEAL_LIMITS.servingLabel) {
      errors.servingLabel = `Use at most ${MEAL_LIMITS.servingLabel} characters.`;
    }
  }

  if (
    Object.keys(errors).length > 0 ||
    name === undefined ||
    basis === undefined ||
    unit === undefined ||
    kcal === undefined ||
    proteinG === undefined ||
    carbsG === undefined ||
    fatG === undefined ||
    amount === undefined
  ) {
    return { ok: false, errors };
  }

  const nutrients = { kcal, proteinG, carbsG, fatG };
  const facts: NutritionFacts =
    basis === "perServing"
      ? { basis, nutrients, serving: { label: servingLabel } }
      : { basis, nutrients };
  return { ok: true, meal: { name, facts, quantity: { amount, unit } } };
}

export type MealCheck =
  | { ok: true; nutrients: Nutrients; warning: string | null }
  | { ok: false; error: string };

/**
 * What the meal adds (unrounded), or why it cannot be saved. Impossible
 * values block saving; suspicious ones only warn, since labels can be odd.
 */
export function checkMeal(meal: Meal): MealCheck {
  const issues = checkNutritionFacts(meal.facts);
  const blocking = issues.find((issue) => issue.severity === "error");
  if (blocking) return { ok: false, error: describeIssue(blocking) };

  const result = calculateNutrients(meal.facts, meal.quantity);
  // The form only offers units that fit the basis, so this means a forged request.
  if (!result.ok) {
    return { ok: false, error: "These values cannot be used with that unit." };
  }

  const warning = issues.find((issue) => issue.severity === "warning");
  return {
    ok: true,
    nutrients: result.nutrients,
    warning: warning ? describeIssue(warning) : null,
  };
}

export function describeIssue(issue: NutritionIssue): string {
  switch (issue.code) {
    case "impossible-energy":
      return `No food has more than ${MAX_KCAL_PER_100G} kcal per 100 g, and this is ${formatNumber(Math.round(issue.kcalPer100g))}. Is it the kJ value?`;
    case "impossible-macros":
      return `Protein, carbs and fat add up to ${formatNumber(roundTo(issue.gramsPer100g, 1))} g per 100 g, more than the food weighs.`;
    case "energy-mismatch":
      return `The macros suggest about ${formatNumber(Math.round(issue.expectedKcal))} kcal, not ${formatNumber(issue.publishedKcal)}. Check the label.`;
  }
}

// Editing a meal changes its name or amount; the food and unit stay the same.

export type MealEditFields = { name: string; amount: string };

/** What the edit form shows after the server answered. */
export type MealEditFormState = {
  errors?: Partial<Record<keyof MealEditFields, string>>;
  error?: string;
};

export function parseMealEdit(
  fields: MealEditFields,
):
  | { ok: true; name: string; amount: number }
  | { ok: false; errors: Partial<Record<keyof MealEditFields, string>> } {
  const name = readName(fields.name);
  const amount = readAmount(fields.amount);
  if (name.ok && amount.ok) {
    return { ok: true, name: name.value, amount: amount.value };
  }
  return {
    ok: false,
    errors: {
      ...(name.ok ? {} : { name: name.error }),
      ...(amount.ok ? {} : { amount: amount.error }),
    },
  };
}

/**
 * The nutrients for a new amount of the same food, in the same unit. The
 * calculation is linear, so the saved snapshot is enough: no need to keep the
 * label's values around.
 */
export function rescaleNutrients(
  nutrients: Nutrients,
  fromAmount: number,
  toAmount: number,
): Nutrients {
  return scaleNutrients(nutrients, toAmount / fromAmount);
}

function readName(text: string): Read<string> {
  const name = text.trim();
  if (name === "") return { ok: false, error: "Enter what you ate." };
  if (name.length > MEAL_LIMITS.name) {
    return { ok: false, error: `Use at most ${MEAL_LIMITS.name} characters.` };
  }
  return { ok: true, value: name };
}

function readNutrient(text: string, example: number): Read<number> {
  const value = parseNumberInput(text, "decimal");
  if (value === "empty") {
    return { ok: false, error: "Enter a number, 0 if the label has none." };
  }
  if (value === "ambiguous") return { ok: false, error: ambiguity(text) };
  if (value === "invalid") {
    return { ok: false, error: `Enter a number, like ${example}.` };
  }
  if (value > MEAL_LIMITS.nutrient) {
    return {
      ok: false,
      error: `Use at most ${formatNumber(MEAL_LIMITS.nutrient)}.`,
    };
  }
  return { ok: true, value };
}

function readAmount(text: string): Read<number> {
  const value = parseNumberInput(text, "decimal");
  if (value === "empty") return { ok: false, error: "Enter how much you ate." };
  if (value === "ambiguous") return { ok: false, error: ambiguity(text) };
  if (value === "invalid") {
    return { ok: false, error: "Enter a number, like 150." };
  }
  if (value === 0) return { ok: false, error: "Enter an amount above 0." };
  if (value > MEAL_LIMITS.amount) {
    return {
      ok: false,
      error: `Use at most ${formatNumber(MEAL_LIMITS.amount)}.`,
    };
  }
  return { ok: true, value };
}

/** "1,200" → "Write 1200 or 1.2: “1,200” could mean either." */
function ambiguity(text: string): string {
  const typed = text.trim();
  const [whole, decimals] = typed.split(",");
  // Number() drops the trailing zeros of the decimal reading: 1.200 → 1.2.
  return `Write ${whole}${decimals} or ${Number(`${whole}.${decimals}`)}: “${typed}” could mean either.`;
}
