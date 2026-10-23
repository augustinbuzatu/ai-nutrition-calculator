import { type LanguageModel, Output, generateText } from "ai";
import * as z from "zod";
import { roundTo } from "@/lib/math";
import {
  type BASES,
  MAX_DESCRIPTION_LENGTH,
  type MealFields,
} from "@/lib/meals/form";
import { type Unit, unitSchema } from "@/lib/nutrition/schemas";
import { INSTRUCTIONS } from "./instructions";
import { parserModel, parserProvider } from "./model";

// Turns "150 g piept de pui și 2 ouă" into the meal form's fields, one set per
// food. The model only reads the text and recalls typical values; the form's
// rules then check every food, and the calculator does the math.

/** Without a key, the log page offers only the manual form. */
export function isParserConfigured(): boolean {
  return parserProvider() !== null;
}

/**
 * The answer the model must give. Only types, no limits: the meal form's rules
 * check each food afterwards, so one odd value does not throw away the rest.
 */
const answerSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      unit: unitSchema,
      servingLabel: z.string().nullable(),
      kcal: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      note: z.string().nullable(),
    }),
  ),
});

type ParsedFood = z.infer<typeof answerSchema>["foods"][number];

/** A food the model found, as the fields of the meal form, to check and edit. */
export type ParsedMeal = { fields: MealFields; note: string | null };

export type ParseResult =
  { ok: true; meals: ParsedMeal[] } | { ok: false; error: string };

// The model gives only a unit; the basis follows from it, so the two can
// never disagree.
const BASIS_FOR_UNIT = {
  g: "per100g",
  kg: "per100g",
  ml: "per100ml",
  l: "per100ml",
  serving: "perServing",
} as const satisfies Record<Unit, keyof typeof BASES>;

export async function parseMealDescription(
  text: string,
  model: LanguageModel = parserModel(),
): Promise<ParseResult> {
  const description = text.trim();
  if (description === "") return { ok: false, error: "Describe what you ate." };
  // Long texts cost more and are rarely one meal.
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Use at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }

  let foods: ParsedFood[];
  try {
    const result = await generateText({
      model,
      instructions: INSTRUCTIONS,
      // The description goes in as the user's message, never into the
      // instructions, so text like "ignore the rules" stays something to read.
      prompt: description,
      output: Output.object({ schema: answerSchema }),
      reasoning: "low",
      // A meal takes a few hundred tokens; the cap bounds the cost of a call.
      maxOutputTokens: 4000,
      timeout: 30_000,
      providerOptions: {
        // OpenAI would otherwise keep the response for 30 days, and send
        // summaries of the model's reasoning that nothing reads.
        openai: { store: false, reasoningSummary: null },
      },
    });
    foods = result.output.foods;
  } catch (error) {
    // A missing key, a quota or an answer that broke the schema: the log says which.
    console.error("The meal parser failed:", error);
    return {
      ok: false,
      error:
        "Your meal could not be read. Please try again, or add it by hand.",
    };
  }

  if (foods.length === 0) {
    return {
      ok: false,
      error:
        "No food or drink found. Try something like “150 g chicken breast and 200 g rice”.",
    };
  }
  return {
    ok: true,
    meals: foods.map((food) => ({
      fields: toMealFields(food),
      note: food.note,
    })),
  };
}

function toMealFields(food: ParsedFood): MealFields {
  return {
    name: food.name,
    basis: BASIS_FOR_UNIT[food.unit],
    servingLabel: food.unit === "serving" ? (food.servingLabel ?? "") : "",
    kcal: toField(food.kcal),
    proteinG: toField(food.proteinG),
    carbsG: toField(food.carbsG),
    fatG: toField(food.fatG),
    amount: toField(food.amount),
    unit: food.unit,
  };
}

// Two decimals are plenty for an estimate, and a can is still 0.33 l.
function toField(value: number): string {
  return String(roundTo(value, 2));
}
