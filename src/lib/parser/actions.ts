"use server";

import { takeAiUse } from "@/lib/ai/access";
import { descriptionRefusal } from "@/lib/ai/limits";
import { requireUser } from "@/lib/auth/user";
import { resolveMeals } from "@/lib/foods/resolve";
import {
  type ParseResult,
  descriptionProblem,
  parseMealDescription,
} from "./parse";

/** Reads a description for the log page; nothing is saved until the user confirms. */
export async function describeMeal(description: string): Promise<ParseResult> {
  await requireUser();
  // The argument comes from the network, whatever its type says.
  if (typeof description !== "string") {
    return { ok: false, error: "Describe what you ate." };
  }
  const problem = descriptionProblem(description);
  if (problem) return { ok: false, error: problem };
  // Each call costs money: only approved accounts, within the daily limits,
  // which the database counts before the model is called.
  const use = await takeAiUse("description");
  if (!use.ok) return { ok: false, error: descriptionRefusal(use.reason) };

  // The model reads the description; the cache then replaces its estimates
  // with published values where it knows the food. The evals call
  // parseMealDescription directly, so they still grade the model alone.
  const result = await parseMealDescription(description);
  if (!result.ok) return result;
  return { ok: true, meals: await resolveMeals(result.meals) };
}
