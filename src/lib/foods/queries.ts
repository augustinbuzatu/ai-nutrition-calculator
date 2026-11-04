import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { type CachedFood, toCachedFood } from "./cache";

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
