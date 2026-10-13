import * as z from "zod";
import { formatNumber } from "@/lib/format";
import { GOAL_LIMITS } from "./limits";

/**
 * A whole number typed into a text field. Stricter than z.coerce.number(),
 * which turns "" into 0 and accepts "1e3" or even "0x7D0" (2000).
 */
function wholeNumber({
  missing,
  example,
  min,
  max,
  unit,
}: {
  missing: string;
  example: number;
  min: number;
  max: number;
  unit: string;
}) {
  const outOfRange = `Choose between ${formatNumber(min)} and ${formatNumber(max)} ${unit}.`;
  return (
    z
      .string({ error: missing })
      .trim()
      // abort: an empty field only needs "enter a value", not every other error too.
      .min(1, { error: missing, abort: true })
      .regex(/^\d+$/, { error: `Use a whole number, like ${example}.` })
      .transform(Number)
      .pipe(
        z
          .number()
          .min(min, { error: outOfRange })
          .max(max, { error: outOfRange }),
      )
  );
}

export const goalsSchema = z.object({
  kcal: wholeNumber({
    missing: "Enter your daily calorie goal.",
    example: 2000,
    unit: "kcal",
    ...GOAL_LIMITS.kcal,
  }),
  protein: wholeNumber({
    missing: "Enter your daily protein goal.",
    example: 150,
    unit: "g",
    ...GOAL_LIMITS.protein,
  }),
});

export type Goals = z.infer<typeof goalsSchema>;

/** Goals as stored: each one stays null until the user sets it in onboarding. */
export type SavedGoals = { kcal: number | null; protein: number | null };

/** True once onboarding is done. As a type guard, it also tells TypeScript both are numbers. */
export function hasGoals(goals: SavedGoals): goals is Goals {
  return goals.kcal !== null && goals.protein !== null;
}

/** What the goals form shows after the server answered. */
export type GoalsFormState = {
  fieldErrors?: { kcal?: string[]; protein?: string[] };
  error?: string;
};
