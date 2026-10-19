import { describe, expect, it } from "vitest";
import type { MealDraft, MealFields } from "./form";
import { readMealDrafts } from "./submission";

const chicken: MealFields = {
  name: "Piept de pui",
  basis: "per100g",
  servingLabel: "",
  kcal: "165",
  proteinG: "31",
  carbsG: "0",
  fatG: "3.6",
  amount: "150",
  unit: "g",
};

const eggs: MealFields = {
  name: "Ouă fierte",
  basis: "perServing",
  servingLabel: "1 ou",
  kcal: "78",
  proteinG: "6.3",
  carbsG: "0.6",
  fatG: "5.3",
  amount: "2",
  unit: "serving",
};

const send = (drafts: unknown) => readMealDrafts(JSON.stringify(drafts));

describe("readMealDrafts", () => {
  it("checks every food and keeps what the user typed", () => {
    const drafts: MealDraft[] = [
      { fields: chicken, description: " 150 g piept de pui și 2 ouă " },
      { fields: eggs, description: " 150 g piept de pui și 2 ouă " },
      { fields: { ...chicken, name: "Orez", kcal: "130" }, description: null },
    ];

    const result = send(drafts);

    expect(result).toEqual({
      ok: true,
      meals: [
        {
          meal: {
            name: "Piept de pui",
            facts: {
              basis: "per100g",
              nutrients: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
            },
            quantity: { amount: 150, unit: "g" },
          },
          nutrients: { kcal: 247.5, proteinG: 46.5, carbsG: 0, fatG: 5.4 },
          description: "150 g piept de pui și 2 ouă",
        },
        expect.objectContaining({
          nutrients: {
            kcal: 156,
            proteinG: 12.6,
            carbsG: 1.2,
            fatG: 10.6,
          },
        }),
        expect.objectContaining({ description: null }),
      ],
    });
  });

  it("stores a blank description as none", () => {
    const result = send([{ fields: chicken, description: "  " }]);
    expect(result).toMatchObject({ ok: true, meals: [{ description: null }] });
  });

  it.each([
    ["no field", null],
    ["a file", new File(["[]"], "meals.json")],
    ["text that is not JSON", "[{"],
    ["an object instead of a list", JSON.stringify({ fields: chicken })],
    [
      "a number instead of text",
      JSON.stringify([
        { fields: { ...chicken, kcal: 165 }, description: null },
      ]),
    ],
    [
      "a missing field",
      JSON.stringify([
        { fields: { ...chicken, unit: undefined }, description: null },
      ]),
    ],
    [
      "a description over the limit",
      JSON.stringify([{ fields: chicken, description: "a".repeat(501) }]),
    ],
  ])("rejects %s", (_case, value) => {
    expect(readMealDrafts(value)).toEqual({
      ok: false,
      error: "Your meals could not be read. Please try again.",
    });
  });

  it("needs between one and twenty foods", () => {
    const draft = { fields: chicken, description: null };
    expect(send([])).toEqual({ ok: false, error: "Add a food first." });
    expect(send(Array(20).fill(draft))).toMatchObject({ ok: true });
    expect(send(Array(21).fill(draft))).toEqual({
      ok: false,
      error: "Save at most 20 foods at a time.",
    });
  });

  it("saves nothing when one food breaks the form's rules", () => {
    expect(
      send([
        { fields: chicken, description: null },
        { fields: { ...eggs, servingLabel: "" }, description: null },
      ]),
    ).toEqual({ ok: false, error: "Some values are missing or wrong." });
  });

  it("saves nothing when one food has impossible values", () => {
    expect(
      send([
        { fields: chicken, description: null },
        { fields: { ...chicken, kcal: "2250" }, description: null },
      ]),
    ).toEqual({
      ok: false,
      error:
        "No food has more than 950 kcal per 100 g, and this is 2,250. Is it the kJ value?",
    });
  });

  it("rejects a unit that does not fit the basis", () => {
    expect(
      send([{ fields: { ...chicken, unit: "serving" }, description: null }]),
    ).toEqual({ ok: false, error: "Some values are missing or wrong." });
  });
});
