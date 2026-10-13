import { describe, expect, it } from "vitest";
import { goalsSchema, hasGoals } from "./schema";

function errorsFor(kcal: unknown, protein: unknown = "150") {
  const result = goalsSchema.safeParse({ kcal, protein });
  return result.success ? null : result.error.issues.map((i) => i.message);
}

describe("goalsSchema", () => {
  it("turns the typed text into whole numbers", () => {
    expect(goalsSchema.parse({ kcal: " 2000 ", protein: "150" })).toEqual({
      kcal: 2000,
      protein: 150,
    });
  });

  it("accepts both ends of each range", () => {
    expect(goalsSchema.safeParse({ kcal: "800", protein: "10" }).success).toBe(
      true,
    );
    expect(
      goalsSchema.safeParse({ kcal: "10000", protein: "500" }).success,
    ).toBe(true);
  });

  it.each(["", "   ", null])(
    "asks for a value when the field is empty (%j), with no other errors",
    (kcal) => {
      expect(errorsFor(kcal)).toEqual(["Enter your daily calorie goal."]);
    },
  );

  it.each(["2000.5", "2,000", "1e3", "0x7D0", "-2000", "abc"])(
    "rejects %j, which is not a plain whole number",
    (kcal) => {
      expect(errorsFor(kcal)).toEqual(["Use a whole number, like 2000."]);
    },
  );

  it.each(["799", "10001"])("rejects %s kcal, outside the range", (kcal) => {
    expect(errorsFor(kcal)).toEqual(["Choose between 800 and 10,000 kcal."]);
  });

  it("checks protein with its own range and messages", () => {
    expect(errorsFor("2000", "501")).toEqual(["Choose between 10 and 500 g."]);
    expect(errorsFor("2000", "")).toEqual(["Enter your daily protein goal."]);
  });
});

describe("hasGoals", () => {
  it("is true only when both goals are set", () => {
    expect(hasGoals({ kcal: 2000, protein: 150 })).toBe(true);
    expect(hasGoals({ kcal: 2000, protein: null })).toBe(false);
    expect(hasGoals({ kcal: null, protein: null })).toBe(false);
  });
});
