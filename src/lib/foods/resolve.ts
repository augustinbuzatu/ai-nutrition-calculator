import type { ParsedMeal } from "@/lib/parser/parse";
import { findPublishedFood, isAgentConfigured } from "./agent";
import { applyCachedFood, findSameFood, publishedAsCached } from "./cache";
import { officialSites } from "./places";
import { saveFood, searchFoods } from "./queries";

/**
 * Step 2 of reading a meal. Each food the model found takes its values from:
 * 1. the cache, when it holds the same food;
 * 2. else the restaurant or shop the description names, read from its site
 *    by the web-search agent, then kept in the cache;
 * 3. else the model's estimate.
 * Each step only ever helps: if one fails, the food keeps its estimate.
 */
export async function resolveMeals(meals: ParsedMeal[]): Promise<ParsedMeal[]> {
  return Promise.all(meals.map(resolveMeal));
}

async function resolveMeal(meal: ParsedMeal): Promise<ParsedMeal> {
  const cached = await fromCache(meal);
  if (cached) return cached;

  const { place } = meal;
  if (!place || !isAgentConfigured()) return meal;
  const where = officialSites(place)?.[0] ?? place;
  const published = await findPublishedFood({ ...meal, place });
  if (!published.ok) {
    return withNote(
      meal,
      `Not found on ${where}, so the values are estimated.`,
    );
  }
  try {
    await saveFood(published.food);
  } catch (error) {
    // The values are still good for this meal; next time the agent searches again.
    console.error("The foods cache could not be saved to:", error);
  }
  return (
    applyCachedFood(meal, publishedAsCached(published.food)) ??
    withNote(
      meal,
      `${where} does not say how much one serving is, so the values are estimated.`,
    )
  );
}

async function fromCache(meal: ParsedMeal): Promise<ParsedMeal | null> {
  try {
    const same = findSameFood(
      meal.fields.name,
      await searchFoods(meal.fields.name),
    );
    return same && applyCachedFood(meal, same);
  } catch (error) {
    console.error("The foods cache could not be searched:", error);
    return null;
  }
}

/** The meal with `note` after what the model assumed. */
function withNote(meal: ParsedMeal, note: string): ParsedMeal {
  return { ...meal, note: meal.note ? `${meal.note} ${note}` : note };
}
