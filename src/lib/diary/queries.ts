import { requireUser } from "@/lib/auth/user";
import type { Nutrients, Unit } from "@/lib/nutrition/schemas";
import { getProfile } from "@/lib/profile";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "./dates";

export type DiaryEntry = {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  /** Unrounded, as calculated when the meal was logged. */
  nutrients: Nutrients;
};

/** The columns every diary query selects, and the row they come back as. */
export const ENTRY_COLUMNS =
  "id, name, quantity, unit, kcal, protein_g, carbs_g, fat_g" as const;
type EntryRow = Pick<
  Database["public"]["Tables"]["food_entries"]["Row"],
  | "id"
  | "name"
  | "quantity"
  | "unit"
  | "kcal"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
>;

/** A database row with the app's names, nutrients grouped. */
export function toDiaryEntry(row: EntryRow): DiaryEntry {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    nutrients: {
      kcal: row.kcal,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
    },
  };
}

export type Diary = {
  /** "YYYY-MM-DD" in the user's time zone. */
  date: string;
  entries: DiaryEntry[];
};

/** What the signed-in user has eaten today, oldest first. */
export async function getTodaysDiary(): Promise<Diary> {
  const user = await requireUser();
  const { timeZone } = await getProfile();
  const date = todayIn(timeZone);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_entries")
    .select(ENTRY_COLUMNS)
    // RLS already limits rows to this user; saying it here lets Postgres use
    // the (user_id, entry_date) index and documents the intent.
    .eq("user_id", user.id)
    .eq("entry_date", date)
    .order("created_at");
  if (error) {
    throw new Error("Could not load today's meals.", { cause: error });
  }

  return { date, entries: data.map(toDiaryEntry) };
}
