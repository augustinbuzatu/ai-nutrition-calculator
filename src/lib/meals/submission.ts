import * as z from "zod";
import type { Nutrients } from "@/lib/nutrition/schemas";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_MEALS_PER_SAVE,
  type Meal,
  checkMeal,
  parseMeal,
} from "./form";

// The log page sends its foods as JSON in one field. The page checks them as
// the user types, but anyone can post to a Server Action: this is the check
// that counts, with the same rules.

const draftsSchema = z.array(
  z.object({
    fields: z.object({
      name: z.string(),
      basis: z.string(),
      servingLabel: z.string(),
      kcal: z.string(),
      proteinG: z.string(),
      carbsG: z.string(),
      fatG: z.string(),
      amount: z.string(),
      unit: z.string(),
    }),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  }),
);

/** A food ready to save: what it is, what it adds, and what the user typed. */
export type CheckedMeal = {
  meal: Meal;
  nutrients: Nutrients;
  description: string | null;
};

export function readMealDrafts(
  value: FormDataEntryValue | null,
): { ok: true; meals: CheckedMeal[] } | { ok: false; error: string } {
  const drafts = draftsSchema.safeParse(parseJson(value));
  if (!drafts.success) {
    return {
      ok: false,
      error: "Your meals could not be read. Please try again.",
    };
  }
  if (drafts.data.length === 0) {
    return { ok: false, error: "Add a food first." };
  }
  if (drafts.data.length > MAX_MEALS_PER_SAVE) {
    return {
      ok: false,
      error: `Save at most ${MAX_MEALS_PER_SAVE} foods at a time.`,
    };
  }

  const meals: CheckedMeal[] = [];
  for (const draft of drafts.data) {
    const parsed = parseMeal(draft.fields);
    if (!parsed.ok) {
      return { ok: false, error: "Some values are missing or wrong." };
    }
    const check = checkMeal(parsed.meal);
    if (!check.ok) return { ok: false, error: check.error };
    meals.push({
      meal: parsed.meal,
      nutrients: check.nutrients,
      description: draft.description?.trim() || null,
    });
  }
  return { ok: true, meals };
}

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
