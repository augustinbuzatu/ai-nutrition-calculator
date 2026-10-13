import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type { SavedGoals } from "./schema";

/** The signed-in user's daily goals, as stored in their profile. */
export async function getGoals(): Promise<SavedGoals> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("daily_kcal_goal, daily_protein_goal")
    .eq("id", user.id)
    .single();
  // A trigger creates every profile at sign-up, so a missing one is a real failure.
  if (error) {
    throw new Error("Could not load the daily goals.", { cause: error });
  }

  // Only what the pages need, with the app's names instead of the column names.
  return { kcal: data.daily_kcal_goal, protein: data.daily_protein_goal };
}
