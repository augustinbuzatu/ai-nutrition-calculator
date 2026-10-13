import { describe, expect, it } from "vitest";
import {
  type BodyStats,
  type BodyStatsFields,
  estimateGoals,
  parseBodyStats,
  restingKcal,
} from "./estimate";

// Worked by hand: 10 × 80 + 6.25 × 180 − 5 × 30 + 5 = 1,780 kcal at rest.
const man: BodyStats = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  goal: "maintain",
};

// 10 × 60 + 6.25 × 165 − 5 × 25 − 161 = 1,345.25 kcal at rest.
const woman: BodyStats = {
  sex: "female",
  age: 25,
  heightCm: 165,
  weightKg: 60,
  activity: "sedentary",
  goal: "maintain",
};

describe("restingKcal", () => {
  it("follows the Mifflin-St Jeor equation for men and women", () => {
    expect(restingKcal(man)).toBe(1780);
    expect(restingKcal(woman)).toBe(1345.25);
  });
});

describe("estimateGoals", () => {
  it("multiplies resting energy by the activity level", () => {
    // 1,780 × 1.55 = 2,759, rounded to 2,760; 80 kg × 1.6 g = 128 g, rounded to 130.
    expect(estimateGoals(man)).toEqual({
      kcal: 2760,
      protein: 130,
      maintenanceKcal: 2760,
    });
  });

  it("eats about 20% less to lose weight and 10% more to gain muscle", () => {
    expect(estimateGoals({ ...man, goal: "lose" }).kcal).toBe(2210); // 2,759 × 0.8
    expect(estimateGoals({ ...man, goal: "gain" }).kcal).toBe(3030); // 2,759 × 1.1
  });

  it("never suggests eating less than the body burns at rest", () => {
    // 1,345.25 × 1.2 × 0.8 = 1,291 is below 1,345.25 at rest, so the floor wins.
    expect(estimateGoals({ ...woman, goal: "lose" })).toEqual({
      kcal: 1350,
      protein: 95,
      maintenanceKcal: 1610,
    });
  });

  it("stays within the limits the goals form accepts", () => {
    // 10 × 35 + 6.25 × 120 − 5 × 100 − 161 = 439 at rest, × 1.2 = 527 kcal.
    const tiny = { ...woman, age: 100, heightCm: 120, weightKg: 35 };
    expect(estimateGoals(tiny).kcal).toBe(800);
  });
});

const filled: BodyStatsFields = {
  sex: "female",
  age: "25",
  heightCm: "165",
  weightKg: "60",
  activity: "sedentary",
  goal: "maintain",
};

describe("parseBodyStats", () => {
  it("reads complete fields into numbers", () => {
    expect(parseBodyStats(filled)).toEqual({ ok: true, stats: woman });
  });

  it("accepts a decimal comma in the weight, the way it is written in Romania", () => {
    const result = parseBodyStats({ ...filled, weightKg: " 72,5 " });
    expect(result.ok && result.stats.weightKg).toBe(72.5);
  });

  it("waits quietly while fields are empty", () => {
    expect(parseBodyStats({ ...filled, heightCm: "" })).toEqual({
      ok: false,
      problem: null,
    });
    expect(parseBodyStats({ ...filled, sex: "" })).toEqual({
      ok: false,
      problem: null,
    });
  });

  it.each([
    ["age", "17", "Age: enter whole years, from 18 to 100."],
    ["age", "30.5", "Age: enter whole years, from 18 to 100."],
    ["heightCm", "1.80", "Height: enter whole cm, from 120 to 230."],
    ["weightKg", "1,000", "Weight: enter kg from 35 to 300, like 72.5."],
  ] as const)("explains what is wrong with %s %j", (field, value, problem) => {
    expect(parseBodyStats({ ...filled, [field]: value })).toEqual({
      ok: false,
      problem,
    });
  });

  it("only accepts its own options, not names inherited by every object", () => {
    expect(parseBodyStats({ ...filled, activity: "toString" }).ok).toBe(false);
  });
});
