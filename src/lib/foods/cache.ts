import { BASES } from "@/lib/meals/form";
import type { NutritionFacts } from "@/lib/nutrition/schemas";
import type { ParsedMeal } from "@/lib/parser/parse";
import type { Database } from "@/lib/supabase/database.types";

// The foods cache: nutrition facts from trusted sources, found by name. Pure
// functions: the database finds candidates, these decide what to use.

export type FoodSource = Database["public"]["Enums"]["food_source"];

export type CachedFood = {
  /** Brand and name, as a card shows them: "KFC Crispy Strips". */
  name: string;
  facts: NutritionFacts;
  source: FoodSource;
  sourceUrl: string | null;
  /** How alike its name is to the one searched for, from 0 to 1. */
  similarity: number;
};

/**
 * A row of search_foods. The generated types call brand, serving_label and
 * source_url strings, but they can be null: the generator cannot tell for a
 * function's result.
 */
type SearchRow = {
  name: string;
  brand: string | null;
  basis: NutritionFacts["basis"];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_label: string | null;
  source: FoodSource;
  source_url: string | null;
  similarity: number;
};

/** A search result with the app's names, or null if it cannot be used. */
export function toCachedFood(row: SearchRow): CachedFood | null {
  const nutrients = {
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  };
  let facts: NutritionFacts;
  if (row.basis === "perServing") {
    // The database requires the label; without it the values mean nothing.
    if (!row.serving_label) return null;
    facts = {
      basis: "perServing",
      nutrients,
      serving: { label: row.serving_label },
    };
  } else {
    facts = { basis: row.basis, nutrients };
  }
  const name =
    row.brand && !row.name.toLowerCase().includes(row.brand.toLowerCase())
      ? `${row.brand} ${row.name}`
      : row.name;
  return {
    name,
    facts,
    source: row.source,
    sourceUrl: row.source_url,
    similarity: row.similarity,
  };
}

/**
 * How alike two names must be for the cache to replace the model's estimate.
 * Spelling, diacritics and word order reach it ("KFC Crispy Strip" and "KFC
 * Crispy Strips": 0.84); different products stay below ("Coca-Cola" and
 * "Coca-Cola Zero": 0.62, "Big Mac" and "Big Mac Menu": 0.67).
 */
export const SAME_FOOD_SIMILARITY = 0.8;

/**
 * The cached food that is the same as `name`, or null. A wrong match is worse
 * than an estimate, so the bar is high, and the numbers in both names must
 * agree: "Lapte 1,5%" is not "Lapte 3,5%", however alike the rest is.
 */
export function findSameFood(
  name: string,
  candidates: readonly CachedFood[],
): CachedFood | null {
  const numbers = numbersIn(name);
  const same = candidates.filter(
    (food) =>
      food.similarity >= SAME_FOOD_SIMILARITY &&
      numbersIn(food.name) === numbers,
  );
  return same.reduce<CachedFood | null>(
    (best, food) => (best && best.similarity >= food.similarity ? best : food),
    null,
  );
}

/** "Lapte 1,5% Zuzu 1l" -> "1 1.5": the numbers, in any order, with a decimal comma or point. */
function numbersIn(text: string): string {
  return Array.from(text.matchAll(/\d+(?:[.,]\d+)?/g), ([number]) =>
    number.replace(",", "."),
  )
    .sort()
    .join(" ");
}

/**
 * The meal with the cached food's values instead of the model's, or null when
 * they do not fit how much was eaten: values per 100 g need an amount in grams,
 * per serving an amount in servings. The amount itself stays as described.
 */
export function applyCachedFood(
  meal: ParsedMeal,
  food: CachedFood,
): ParsedMeal | null {
  const units: readonly string[] = BASES[food.facts.basis].units;
  if (!units.includes(meal.fields.unit)) return null;
  const { nutrients } = food.facts;
  return {
    fields: {
      ...meal.fields,
      name: food.name,
      basis: food.facts.basis,
      servingLabel:
        food.facts.basis === "perServing" ? food.facts.serving.label : "",
      kcal: String(nutrients.kcal),
      proteinG: String(nutrients.proteinG),
      carbsG: String(nutrients.carbsG),
      fatG: String(nutrients.fatG),
    },
    note: `Values from ${sourceName(food)}.`,
  };
}

function sourceName(food: CachedFood): string {
  switch (food.source) {
    case "usda":
      return "USDA FoodData Central";
    case "openfoodfacts":
      return "Open Food Facts";
    case "web":
      return hostOf(food.sourceUrl) ?? "the web";
    case "user":
      return "your saved foods";
    case "ai_estimate":
      return "an earlier estimate";
  }
}

/** "https://www.kfc.ro/meniu" -> "kfc.ro", or null for anything else. */
function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
