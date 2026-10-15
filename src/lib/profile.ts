import { cache } from "react";
import { requireUser } from "@/lib/auth/user";
import type { SavedGoals } from "@/lib/goals/schema";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  goals: SavedGoals;
  /** An IANA name such as "Europe/Bucharest": decides which day a meal belongs to. */
  timeZone: string;
};

/**
 * The signed-in user's profile. cache() reads it once per request, although
 * both the goals and today's diary need it.
 */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("daily_kcal_goal, daily_protein_goal, timezone")
    .eq("id", user.id)
    .single();
  // A trigger creates every profile at sign-up, so a missing one is a real failure.
  if (error) {
    throw new Error("Could not load the profile.", { cause: error });
  }

  // Only what the pages need, with the app's names instead of the column names.
  return {
    goals: { kcal: data.daily_kcal_goal, protein: data.daily_protein_goal },
    timeZone: data.timezone,
  };
});
