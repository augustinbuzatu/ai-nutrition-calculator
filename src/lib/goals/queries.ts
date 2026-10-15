import { getProfile } from "@/lib/profile";
import type { SavedGoals } from "./schema";

/** The signed-in user's daily goals, as stored in their profile. */
export async function getGoals(): Promise<SavedGoals> {
  const { goals } = await getProfile();
  return goals;
}
