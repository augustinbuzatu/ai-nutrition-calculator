"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { type GoalsFormState, goalsSchema } from "./schema";

export async function saveGoals(
  _previous: GoalsFormState,
  formData: FormData,
): Promise<GoalsFormState> {
  const user = await requireUser();
  const parsed = goalsSchema.safeParse({
    kcal: formData.get("kcal"),
    protein: formData.get("protein"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      daily_kcal_goal: parsed.data.kcal,
      daily_protein_goal: parsed.data.protein,
    })
    .eq("id", user.id)
    // An UPDATE that matches no row is not an error in SQL. Asking for the
    // row back with single() turns "nothing was saved" into one.
    .select("id")
    .single();
  if (error) {
    return { error: "Your goals could not be saved. Please try again." };
  }

  revalidatePath("/");
  redirect("/");
}
