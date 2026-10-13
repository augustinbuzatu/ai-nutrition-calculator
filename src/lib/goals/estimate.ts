import { GOAL_LIMITS } from "./limits";

export type Sex = "male" | "female";
export type ActivityLevel =
  "sedentary" | "light" | "moderate" | "active" | "veryActive";
export type WeightGoal = "lose" | "maintain" | "gain";

export type BodyStats = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: WeightGoal;
};

export const SEXES = {
  female: "Female",
  male: "Male",
} as const satisfies Record<Sex, string>;

/** The standard multipliers from resting energy to a whole day's energy. */
export const ACTIVITY_LEVELS = {
  sedentary: { factor: 1.2, label: "Sedentary: desk job, little exercise" },
  light: { factor: 1.375, label: "Light: exercise 1–3 days a week" },
  moderate: { factor: 1.55, label: "Moderate: exercise 3–5 days a week" },
  active: { factor: 1.725, label: "Active: hard exercise 6–7 days a week" },
  veryActive: {
    factor: 1.9,
    label: "Very active: physical job or training twice a day",
  },
} as const satisfies Record<ActivityLevel, { factor: number; label: string }>;

export const WEIGHT_GOALS = {
  lose: { kcalFactor: 0.8, label: "Lose weight (eat about 20% less)" },
  maintain: { kcalFactor: 1, label: "Maintain weight" },
  gain: { kcalFactor: 1.1, label: "Gain muscle (eat about 10% more)" },
} as const satisfies Record<WeightGoal, { kcalFactor: number; label: string }>;

/**
 * Grams of protein per kg of body weight. Most studies find extra protein
 * stops helping muscle around here (Morton et al., 2018).
 */
const PROTEIN_PER_KG = 1.6;

/**
 * Energy burned at rest, in kcal a day, by the Mifflin-St Jeor equation:
 * the most accurate of the common equations for healthy adults.
 */
export function restingKcal({
  sex,
  age,
  heightCm,
  weightKg,
}: Pick<BodyStats, "sex" | "age" | "heightCm" | "weightKg">): number {
  return (
    10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161)
  );
}

export type GoalsEstimate = {
  kcal: number;
  protein: number;
  /** What keeps the weight stable: shown for context, not saved. */
  maintenanceKcal: number;
};

export function estimateGoals(stats: BodyStats): GoalsEstimate {
  const resting = restingKcal(stats);
  const maintenance = resting * ACTIVITY_LEVELS[stats.activity].factor;
  // A deficit never goes below resting energy: eating less than that is a
  // decision for a doctor, not for an app.
  const target = Math.max(
    maintenance * WEIGHT_GOALS[stats.goal].kcalFactor,
    resting,
  );

  // Rounded on purpose: the equation is only accurate to about 10%, so
  // "2,137 kcal" would claim a precision it does not have.
  return {
    kcal: clamp(roundToStep(target, 10), GOAL_LIMITS.kcal),
    protein: clamp(
      roundToStep(stats.weightKg * PROTEIN_PER_KG, 5),
      GOAL_LIMITS.protein,
    ),
    maintenanceKcal: roundToStep(maintenance, 10),
  };
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Keeps the estimate inside what the goals form (and the database) accept. */
function clamp(value: number, { min, max }: { min: number; max: number }) {
  return Math.min(Math.max(value, min), max);
}

/** The ranges the calculator accepts. The equation was built from adults. */
export const BODY_LIMITS = {
  age: { min: 18, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 300 },
} as const;

/** The calculator's fields, as typed or chosen ("" while still empty). */
export type BodyStatsFields = Record<keyof BodyStats, string>;

export type ParsedBodyStats =
  | { ok: true; stats: BodyStats }
  | {
      ok: false;
      /** What to fix, or null when fields are just not filled in yet. */
      problem: string | null;
    };

/**
 * Reads the calculator's fields. No Zod here: this runs in the browser on
 * every keystroke, and a few checks do not justify shipping a library.
 */
export function parseBodyStats(fields: BodyStatsFields): ParsedBodyStats {
  const age = parseNumber(fields.age, "whole", BODY_LIMITS.age);
  if (age === "invalid") {
    return { ok: false, problem: "Age: enter whole years, from 18 to 100." };
  }
  const heightCm = parseNumber(fields.heightCm, "whole", BODY_LIMITS.heightCm);
  if (heightCm === "invalid") {
    return { ok: false, problem: "Height: enter whole cm, from 120 to 230." };
  }
  const weightKg = parseNumber(
    fields.weightKg,
    "decimal",
    BODY_LIMITS.weightKg,
  );
  if (weightKg === "invalid") {
    return {
      ok: false,
      problem: "Weight: enter kg from 35 to 300, like 72.5.",
    };
  }

  const { sex, activity, goal } = fields;
  if (
    age === null ||
    heightCm === null ||
    weightKg === null ||
    !isKeyOf(sex, SEXES) ||
    !isKeyOf(activity, ACTIVITY_LEVELS) ||
    !isKeyOf(goal, WEIGHT_GOALS)
  ) {
    return { ok: false, problem: null };
  }
  return { ok: true, stats: { sex, age, heightCm, weightKg, activity, goal } };
}

/** null when empty, "invalid" when it is not a number in range. */
function parseNumber(
  text: string,
  kind: "whole" | "decimal",
  { min, max }: { min: number; max: number },
): number | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  // A decimal comma is accepted: "72,5" is how weight is written in Romania.
  // (No thousands separator can be meant here: no one weighs 1,000 kg.)
  const pattern = kind === "whole" ? /^\d+$/ : /^\d+([.,]\d+)?$/;
  if (!pattern.test(trimmed)) return "invalid";
  const value = Number(trimmed.replace(",", "."));
  return value >= min && value <= max ? value : "invalid";
}

/** Object.hasOwn, not `in`: "toString" in {} is true, inherited from Object. */
function isKeyOf<T extends object>(
  value: string,
  object: T,
): value is Extract<keyof T, string> {
  return Object.hasOwn(object, value);
}
