import { formatNumber } from "@/lib/format";
import { roundTo } from "@/lib/math";
import { BASES } from "@/lib/meals/form";
import { scaleNutrients } from "@/lib/nutrition/calculate";
import type { NutritionFacts, Serving } from "@/lib/nutrition/schemas";
import type { ParsedMeal } from "@/lib/parser/parse";
import type { Database } from "@/lib/supabase/database.types";
import type { PublishedFood } from "./published";

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
 * A row of search_foods. The generated types call brand, serving_label,
 * serving_grams, serving_ml and source_url non-null, but they can be null: the
 * generator cannot tell for a function's result.
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
  serving_grams: number | null;
  serving_ml: number | null;
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
  // What one serving is, with its weight or volume when published: values per
  // 100 g then also serve food counted in pieces.
  const serving: Serving | undefined = row.serving_label
    ? {
        label: row.serving_label,
        ...(row.serving_grams ? { grams: row.serving_grams } : {}),
        ...(row.serving_ml ? { ml: row.serving_ml } : {}),
      }
    : undefined;
  let facts: NutritionFacts;
  if (row.basis === "perServing") {
    // The database requires the label; without it the values mean nothing.
    if (!serving) return null;
    facts = { basis: "perServing", nutrients, serving };
  } else {
    facts = serving
      ? { basis: row.basis, nutrients, serving }
      : { basis: row.basis, nutrients };
  }
  return {
    name: withBrand(row.name, row.brand),
    facts,
    source: row.source,
    sourceUrl: row.source_url,
    similarity: row.similarity,
  };
}

/** Values the agent just found, as the cache will return them next time. */
export function publishedAsCached(food: PublishedFood): CachedFood {
  return {
    name: withBrand(food.name, food.place),
    facts: food.facts,
    source: "web",
    sourceUrl: food.sourceUrl,
    similarity: 1,
  };
}

/** "Crispy Strips" by KFC -> "KFC Crispy Strips", without saying KFC twice. */
function withBrand(name: string, brand: string | null): string {
  return brand && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${brand} ${name}`
    : name;
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
 * they do not fit how much was eaten. The amount itself stays as described.
 */
export function applyCachedFood(
  meal: ParsedMeal,
  food: CachedFood,
): ParsedMeal | null {
  const facts = factsFor(meal.fields.unit, food.facts);
  if (!facts) return null;
  const { nutrients } = facts;
  return {
    fields: {
      ...meal.fields,
      name: food.name,
      basis: facts.basis,
      servingLabel: facts.basis === "perServing" ? facts.serving.label : "",
      kcal: toField(nutrients.kcal),
      proteinG: toField(nutrients.proteinG),
      carbsG: toField(nutrients.carbsG),
      fatG: toField(nutrients.fatG),
    },
    note: `Values from ${sourceName(food)}.`,
    place: meal.place,
  };
}

/**
 * The facts in a basis that fits `unit`, or null. Grams need values per 100 g
 * and servings values per serving, as published; or, for servings, values per
 * 100 g with what one serving weighs, which the app converts: KFC publishes
 * its strips per 100 g and one strip as 30 g.
 */
function factsFor(unit: string, facts: NutritionFacts): NutritionFacts | null {
  const units: readonly string[] = BASES[facts.basis].units;
  if (units.includes(unit)) return facts;
  if (unit !== "serving" || facts.basis === "perServing" || !facts.serving) {
    return null;
  }
  const [size, sizeUnit] =
    facts.basis === "per100g"
      ? [facts.serving.grams, "g"]
      : [facts.serving.ml, "ml"];
  if (!size) return null;
  const { label } = facts.serving;
  const sized = `${formatNumber(size)}\u00a0${sizeUnit}`;
  return {
    basis: "perServing",
    nutrients: scaleNutrients(facts.nutrients, size / 100),
    // "1 buc., 30 g", unless the label already says how much.
    serving: {
      label: label
        .replace(/\s/g, "")
        .includes(`${formatNumber(size)}${sizeUnit}`)
        ? label
        : `${label}, ${sized}`,
    },
  };
}

// Two decimals are plenty for a form field, and hide floating-point noise.
function toField(value: number): string {
  return String(roundTo(value, 2));
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
