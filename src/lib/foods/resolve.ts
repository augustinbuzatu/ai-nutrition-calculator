import type { ParsedMeal } from "@/lib/parser/parse";
import { applyCachedFood, findSameFood } from "./cache";
import { searchFoods } from "./queries";

/**
 * Step 2 of reading a meal: each food the model found takes its values from
 * the cache when the cache holds the same food, and keeps the model's
 * estimate otherwise. The cache only ever helps: if it cannot be searched,
 * every food keeps its estimate.
 */
export async function resolveMeals(meals: ParsedMeal[]): Promise<ParsedMeal[]> {
  return Promise.all(
    meals.map(async (meal) => {
      try {
        const same = findSameFood(
          meal.fields.name,
          await searchFoods(meal.fields.name),
        );
        return (same && applyCachedFood(meal, same)) ?? meal;
      } catch (error) {
        console.error("The foods cache could not be searched:", error);
        return meal;
      }
    }),
  );
}
