import * as z from "zod";
import { requireUser } from "@/lib/auth/user";
import {
  type DiaryEntry,
  ENTRY_COLUMNS,
  toDiaryEntry,
} from "@/lib/diary/queries";
import { createClient } from "@/lib/supabase/server";

/** One of the signed-in user's meals, or null if there is no such meal. */
export async function getMeal(id: string): Promise<DiaryEntry | null> {
  const user = await requireUser();
  // The id comes from the URL. Anything but a UUID would make Postgres throw;
  // to the user it is simply a meal that does not exist.
  if (!z.uuid().safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_entries")
    .select(ENTRY_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    // Another user's meal is invisible under RLS, so it reads as "not found",
    // without saying whether it exists.
    .maybeSingle();
  if (error) {
    throw new Error("Could not load the meal.", { cause: error });
  }
  return data && toDiaryEntry(data);
}
