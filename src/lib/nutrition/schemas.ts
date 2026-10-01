import { z } from "zod";

/** Energy in kcal and the three macronutrients in grams. */
export const nutrientsSchema = z.object({
  kcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

/** What "one serving" of a food means: "1 strip" weighing 40 g, "1 can" holding 330 ml... */
export const servingSchema = z.object({
  label: z.string().trim().min(1),
  grams: z.number().positive().optional(),
  ml: z.number().positive().optional(),
});

/**
 * Nutrition facts exactly as a source publishes them: per 100 g, per 100 ml or
 * per serving. They are stored as published and only converted when calculating.
 */
export const nutritionFactsSchema = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("per100g"),
    nutrients: nutrientsSchema,
    serving: servingSchema.optional(),
  }),
  z.object({
    basis: z.literal("per100ml"),
    nutrients: nutrientsSchema,
    serving: servingSchema.optional(),
  }),
  z.object({
    basis: z.literal("perServing"),
    nutrients: nutrientsSchema,
    // Per-serving values mean nothing without saying what the serving is.
    serving: servingSchema,
  }),
]);

export const unitSchema = z.enum(["g", "kg", "ml", "l", "serving"]);

/** How much was eaten, in the unit the user said: 150 g, 0.5 l, 3 servings... */
export const quantitySchema = z.object({
  amount: z.number().positive(),
  unit: unitSchema,
});

export type Nutrients = z.infer<typeof nutrientsSchema>;
export type Serving = z.infer<typeof servingSchema>;
export type NutritionFacts = z.infer<typeof nutritionFactsSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type Quantity = z.infer<typeof quantitySchema>;
