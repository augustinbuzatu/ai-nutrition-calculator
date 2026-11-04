import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { type CachedFood, toCachedFood } from "./cache";
import type { PublishedFood } from "./published";

/**
 * The cached foods most like `name`, best first: the shared catalog and the
 * user's own foods, as RLS allows. Throws if the database cannot be reached.
 */
export async function searchFoods(name: string): Promise<CachedFood[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_foods", {
    query: name,
    // The app uses only the closest; a few more help when debugging.
    max_results: 5,
  });
  if (error) {
    throw new Error("Could not search the foods cache.", { cause: error });
  }
  return data.map(toCachedFood).filter((food) => food !== null);
}

/**
 * Keeps values the agent found as the user's own food, so the next search
 * finds them without searching the web again. Private, so a wrong value
 * stays with one user; RLS sets it as theirs.
 */
export async function saveFood(food: PublishedFood): Promise<void> {
  await requireUser();
  const { facts } = food;
  const supabase = await createClient();
  const { error } = await supabase.from("foods").insert({
    name: food.name,
    brand: food.place,
    basis: facts.basis,
    kcal: facts.nutrients.kcal,
    protein_g: facts.nutrients.proteinG,
    carbs_g: facts.nutrients.carbsG,
    fat_g: facts.nutrients.fatG,
    serving_label: facts.serving?.label ?? null,
    serving_grams: facts.serving?.grams ?? null,
    serving_ml: facts.serving?.ml ?? null,
    source: "web",
    source_url: food.sourceUrl,
  });
  if (error) {
    throw new Error("Could not save the food to the cache.", { cause: error });
  }
}
