import { roundTo } from "@/lib/math";
import type { Nutrients, NutritionFacts, Quantity } from "./schemas";

export type CalculationError =
  /** Converting servings to grams or ml (or back) needs a serving size the source did not give. */
  | { code: "missing-serving-size"; needs: "grams" | "ml" }
  /** Grams of a food published per 100 ml (or the reverse) would need its density. */
  | {
      code: "unit-mismatch";
      eaten: "mass" | "volume";
      published: "mass" | "volume";
    };

export type CalculationResult =
  { ok: true; nutrients: Nutrients } | { ok: false; error: CalculationError };

type Eaten =
  | { kind: "mass"; grams: number }
  | { kind: "volume"; ml: number }
  | { kind: "servings"; count: number };

type Multiplier =
  { ok: true; value: number } | { ok: false; error: CalculationError };

/**
 * Nutrients in the eaten quantity of a food.
 *
 * Pure and deterministic: the same input always gives the same output, and
 * nothing is rounded here. Round only for display, after adding values up.
 */
export function calculateNutrients(
  facts: NutritionFacts,
  quantity: Quantity,
): CalculationResult {
  const multiplier = getMultiplier(facts, normalize(quantity));
  if (!multiplier.ok) return multiplier;
  return {
    ok: true,
    nutrients: scaleNutrients(facts.nutrients, multiplier.value),
  };
}

export function scaleNutrients(
  nutrients: Nutrients,
  factor: number,
): Nutrients {
  return {
    kcal: nutrients.kcal * factor,
    proteinG: nutrients.proteinG * factor,
    carbsG: nutrients.carbsG * factor,
    fatG: nutrients.fatG * factor,
  };
}

/** Display precision: whole kcal, macros to 0.1 g. */
export function roundNutrients(nutrients: Nutrients): Nutrients {
  return {
    kcal: roundTo(nutrients.kcal, 0),
    proteinG: roundTo(nutrients.proteinG, 1),
    carbsG: roundTo(nutrients.carbsG, 1),
    fatG: roundTo(nutrients.fatG, 1),
  };
}

/** Converts the user's unit to grams, millilitres or a number of servings. */
function normalize({ amount, unit }: Quantity): Eaten {
  switch (unit) {
    case "g":
      return { kind: "mass", grams: amount };
    case "kg":
      return { kind: "mass", grams: amount * 1000 };
    case "ml":
      return { kind: "volume", ml: amount };
    case "l":
      return { kind: "volume", ml: amount * 1000 };
    case "serving":
      return { kind: "servings", count: amount };
  }
}

/**
 * How many times the published values apply to what was eaten:
 * 150 g of a food published per 100 g -> 1.5, 3 servings of a per-serving food -> 3.
 */
function getMultiplier(facts: NutritionFacts, eaten: Eaten): Multiplier {
  switch (facts.basis) {
    case "per100g": {
      if (eaten.kind === "volume") return unitMismatch("volume", "mass");
      if (eaten.kind === "mass") return ok(eaten.grams / 100);
      const grams = facts.serving?.grams;
      if (grams === undefined) return missingServingSize("grams");
      return ok((eaten.count * grams) / 100);
    }
    case "per100ml": {
      if (eaten.kind === "mass") return unitMismatch("mass", "volume");
      if (eaten.kind === "volume") return ok(eaten.ml / 100);
      const ml = facts.serving?.ml;
      if (ml === undefined) return missingServingSize("ml");
      return ok((eaten.count * ml) / 100);
    }
    case "perServing": {
      // TypeScript knows `serving` is always present for this basis (see schemas.ts).
      const { serving } = facts;
      if (eaten.kind === "servings") return ok(eaten.count);
      if (eaten.kind === "mass") {
        if (serving.grams === undefined) return missingServingSize("grams");
        return ok(eaten.grams / serving.grams);
      }
      if (serving.ml === undefined) return missingServingSize("ml");
      return ok(eaten.ml / serving.ml);
    }
  }
}

function ok(value: number): Multiplier {
  return { ok: true, value };
}

function missingServingSize(needs: "grams" | "ml"): Multiplier {
  return { ok: false, error: { code: "missing-serving-size", needs } };
}

function unitMismatch(
  eaten: "mass" | "volume",
  published: "mass" | "volume",
): Multiplier {
  return { ok: false, error: { code: "unit-mismatch", eaten, published } };
}
