import { scaleNutrients } from "./calculate";
import type { Nutrients, NutritionFacts } from "./schemas";

/** Kcal per gram of protein, carbohydrate and fat (the Atwater general factors). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** Pure fat has about 900 kcal per 100 g; the margin absorbs rounding in published tables. */
const MAX_KCAL_PER_100G = 950;
/** Protein, carbs and fat together cannot outweigh the food; 2 g of margin for rounding. */
const MAX_MACRO_GRAMS_PER_100G = 102;
/** How far published kcal may drift from kcal computed from macros (fibre, rounding). */
const ENERGY_TOLERANCE = 0.15;
/** Below this gap, low-calorie foods (vegetables, drinks) are never flagged. */
const ENERGY_TOLERANCE_MIN_KCAL = 10;

export type NutritionIssue =
  | { severity: "error"; code: "impossible-energy"; kcalPer100g: number }
  | { severity: "error"; code: "impossible-macros"; gramsPer100g: number }
  | {
      severity: "warning";
      code: "energy-mismatch";
      publishedKcal: number;
      expectedKcal: number;
    };

/**
 * Finds nutrition facts that cannot be right (errors: reject the data) or look
 * suspicious (warnings: ask the user to confirm). Typical catches: values in kJ
 * instead of kcal, a value per serving mixed with values per 100 g, typos.
 */
export function checkNutritionFacts(facts: NutritionFacts): NutritionIssue[] {
  const issues: NutritionIssue[] = [];

  const per100g = toPer100g(facts);
  if (per100g) {
    if (per100g.kcal > MAX_KCAL_PER_100G) {
      issues.push({
        severity: "error",
        code: "impossible-energy",
        kcalPer100g: per100g.kcal,
      });
    }
    const macroGrams = per100g.proteinG + per100g.carbsG + per100g.fatG;
    if (macroGrams > MAX_MACRO_GRAMS_PER_100G) {
      issues.push({
        severity: "error",
        code: "impossible-macros",
        gramsPer100g: macroGrams,
      });
    }
  }

  const publishedKcal = facts.nutrients.kcal;
  const expectedKcal = kcalFromMacros(facts.nutrients);
  const allowedGap = Math.max(
    ENERGY_TOLERANCE * Math.max(publishedKcal, expectedKcal),
    ENERGY_TOLERANCE_MIN_KCAL,
  );
  if (Math.abs(publishedKcal - expectedKcal) > allowedGap) {
    issues.push({
      severity: "warning",
      code: "energy-mismatch",
      publishedKcal,
      expectedKcal,
    });
  }

  return issues;
}

export function kcalFromMacros({ proteinG, carbsG, fatG }: Nutrients): number {
  return (
    proteinG * KCAL_PER_GRAM.protein +
    carbsG * KCAL_PER_GRAM.carbs +
    fatG * KCAL_PER_GRAM.fat
  );
}

/**
 * The facts scaled to 100 g, or null when the weight is unknown: per 100 ml
 * (a density would be needed) or a serving without grams.
 */
function toPer100g(facts: NutritionFacts): Nutrients | null {
  if (facts.basis === "per100g") return facts.nutrients;
  if (facts.basis === "perServing" && facts.serving.grams !== undefined) {
    return scaleNutrients(facts.nutrients, 100 / facts.serving.grams);
  }
  return null;
}
