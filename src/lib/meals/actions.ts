"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { requireUser } from "@/lib/auth/user";
import { todayIn } from "@/lib/diary/dates";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import {
  type MealEditFields,
  type MealEditFormState,
  type MealFields,
  type MealFormState,
  checkMeal,
  parseMeal,
  parseMealEdit,
  rescaleNutrients,
} from "./form";
import { getMeal } from "./queries";

// The browser runs parseMeal and checkMeal for its live preview, but anyone
// can post to a Server Action: these runs are the ones that count.

export async function addMeal(
  _previous: MealFormState,
  formData: FormData,
): Promise<MealFormState> {
  await requireUser();
  const parsed = parseMeal(
    readFields<keyof MealFields>(formData, [
      "name",
      "basis",
      "servingLabel",
      "kcal",
      "proteinG",
      "carbsG",
      "fatG",
      "amount",
      "unit",
    ]),
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const check = checkMeal(parsed.meal);
  if (!check.ok) return { error: check.error };

  const { timeZone } = await getProfile();
  const { meal } = parsed;
  const supabase = await createClient();
  // user_id is left out: the database fills it in from the session
  // (default auth.uid()), and RLS rejects any other value.
  const { error } = await supabase.from("food_entries").insert({
    entry_date: todayIn(timeZone),
    name: meal.name,
    quantity: meal.quantity.amount,
    unit: meal.quantity.unit,
    // A snapshot of the result, unrounded: later edits to a food never
    // rewrite what was eaten.
    kcal: check.nutrients.kcal,
    protein_g: check.nutrients.proteinG,
    carbs_g: check.nutrients.carbsG,
    fat_g: check.nutrients.fatG,
  });
  if (error) {
    return { error: "Your meal could not be saved. Please try again." };
  }

  revalidatePath("/");
  redirect("/");
}

/** Called as updateMeal.bind(null, id), so the form only sends name and amount. */
export async function updateMeal(
  id: string,
  _previous: MealEditFormState,
  formData: FormData,
): Promise<MealEditFormState> {
  const user = await requireUser();
  // Reading the meal first also checks that it exists and belongs to this user.
  const meal = await getMeal(id);
  if (!meal) return { error: "This meal no longer exists." };

  const parsed = parseMealEdit(
    readFields<keyof MealEditFields>(formData, ["name", "amount"]),
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const nutrients = rescaleNutrients(
    meal.nutrients,
    meal.quantity,
    parsed.amount,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_entries")
    .update({
      name: parsed.name,
      quantity: parsed.amount,
      kcal: nutrients.kcal,
      protein_g: nutrients.proteinG,
      carbs_g: nutrients.carbsG,
      fat_g: nutrients.fatG,
    })
    .eq("id", meal.id)
    .eq("user_id", user.id)
    // An UPDATE that matches no row is not an error in SQL; single() makes it one.
    .select("id")
    .single();
  if (error) {
    return { error: "Your changes could not be saved. Please try again." };
  }

  revalidatePath("/");
  redirect("/");
}

/** Called as deleteMeal.bind(null, id) from a form. */
export async function deleteMeal(id: string) {
  const user = await requireUser();
  if (z.uuid().safeParse(id).success) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("food_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      throw new Error("Could not delete the meal.", { cause: error });
    }
  }
  // A meal that was already gone ends the same way: not in the diary.
  revalidatePath("/");
  redirect("/");
}

/** The named fields as strings: a missing field, or a file, reads as "". */
function readFields<K extends string>(
  formData: FormData,
  names: readonly K[],
): Record<K, string> {
  const fields = {} as Record<K, string>;
  for (const name of names) {
    const value = formData.get(name);
    fields[name] = typeof value === "string" ? value : "";
  }
  return fields;
}
