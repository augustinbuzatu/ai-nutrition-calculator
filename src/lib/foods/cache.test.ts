import { describe, expect, it } from "vitest";
import { parseMeal } from "@/lib/meals/form";
import type { ParsedMeal } from "@/lib/parser/parse";
import {
  type CachedFood,
  SAME_FOOD_SIMILARITY,
  applyCachedFood,
  findSameFood,
  toCachedFood,
} from "./cache";

const row = {
  name: "Crispy Strips",
  brand: "KFC",
  basis: "perServing" as const,
  kcal: 130,
  protein_g: 10,
  carbs_g: 8,
  fat_g: 6.5,
  serving_label: "1 strip",
  source: "web" as const,
  source_url: "https://www.kfc.ro/meniu",
  similarity: 1,
};

const strips: CachedFood = {
  name: "KFC Crispy Strips",
  facts: {
    basis: "perServing",
    nutrients: { kcal: 130, proteinG: 10, carbsG: 8, fatG: 6.5 },
    serving: { label: "1 strip" },
  },
  source: "web",
  sourceUrl: "https://www.kfc.ro/meniu",
  similarity: 1,
};

/** What the model made of "3 crispy strips de la KFC". */
const parsedStrips: ParsedMeal = {
  fields: {
    name: "KFC Crispy Strips",
    basis: "perServing",
    servingLabel: "1 fâșie",
    kcal: "127",
    proteinG: "7",
    carbsG: "9",
    fatG: "7",
    amount: "3",
    unit: "serving",
  },
  note: "Assumed regular strips.",
};

describe("toCachedFood", () => {
  it("names a food with its brand, and groups its facts", () => {
    expect(toCachedFood(row)).toEqual(strips);
  });

  it("does not repeat a brand the name already has", () => {
    expect(toCachedFood({ ...row, name: "KFC Crispy Strips" })?.name).toBe(
      "KFC Crispy Strips",
    );
    expect(toCachedFood({ ...row, brand: null })?.name).toBe("Crispy Strips");
  });

  it("keeps values per 100 g without a serving", () => {
    expect(
      toCachedFood({ ...row, basis: "per100g", serving_label: null })?.facts,
    ).toEqual({
      basis: "per100g",
      nutrients: { kcal: 130, proteinG: 10, carbsG: 8, fatG: 6.5 },
    });
  });

  it("drops values per serving that do not say what the serving is", () => {
    expect(toCachedFood({ ...row, serving_label: null })).toBeNull();
  });
});

describe("findSameFood", () => {
  const withSimilarity = (name: string, similarity: number): CachedFood => ({
    ...strips,
    name,
    similarity,
  });

  it("takes the closest food that is alike enough", () => {
    const found = findSameFood("KFC Crispy Strips", [
      withSimilarity("KFC Crispy Strip", 0.84),
      withSimilarity("KFC Crispy Strips", 1),
    ]);
    expect(found?.name).toBe("KFC Crispy Strips");
  });

  it("ignores foods below the bar", () => {
    expect(
      findSameFood("Coca-Cola", [
        withSimilarity("Coca-Cola Zero", SAME_FOOD_SIMILARITY - 0.01),
      ]),
    ).toBeNull();
    expect(
      findSameFood("Coca-Cola", [
        withSimilarity("Coca-Cola", SAME_FOOD_SIMILARITY),
      ])?.name,
    ).toBe("Coca-Cola");
    expect(findSameFood("Coca-Cola", [])).toBeNull();
  });

  it("needs the same numbers in both names, however alike the rest is", () => {
    expect(
      findSameFood("Lapte 1,5%", [withSimilarity("Lapte 3,5%", 0.95)]),
    ).toBeNull();
    expect(
      findSameFood("Lapte", [withSimilarity("Lapte 1,5%", 0.9)]),
    ).toBeNull();
    expect(
      findSameFood("Lapte Zuzu 1,5% 1 l", [
        withSimilarity("Zuzu 1 l lapte 1.5%", 0.9),
      ])?.name,
    ).toBe("Zuzu 1 l lapte 1.5%");
  });
});

describe("applyCachedFood", () => {
  it("replaces the estimate with the cached values, and keeps the amount", () => {
    const applied = applyCachedFood(parsedStrips, strips);
    expect(applied).toEqual({
      fields: {
        name: "KFC Crispy Strips",
        basis: "perServing",
        servingLabel: "1 strip",
        kcal: "130",
        proteinG: "10",
        carbsG: "8",
        fatG: "6.5",
        amount: "3",
        unit: "serving",
      },
      note: "Values from kfc.ro.",
    });
    // The card can be saved as it is.
    expect(applied && parseMeal(applied.fields).ok).toBe(true);
  });

  it("uses values per 100 g or per 100 ml for amounts in grams or millilitres", () => {
    const milk: CachedFood = {
      name: "Lapte 1,5%",
      facts: {
        basis: "per100ml",
        nutrients: { kcal: 46, proteinG: 3.4, carbsG: 4.8, fatG: 1.5 },
      },
      source: "openfoodfacts",
      sourceUrl: null,
      similarity: 1,
    };
    const applied = applyCachedFood(
      {
        fields: {
          ...parsedStrips.fields,
          name: "Lapte 1,5%",
          basis: "per100ml",
          servingLabel: "",
          amount: "0.5",
          unit: "l",
        },
        note: null,
      },
      milk,
    );
    expect(applied?.fields).toMatchObject({
      basis: "per100ml",
      servingLabel: "",
      kcal: "46",
      amount: "0.5",
      unit: "l",
    });
    expect(applied?.note).toBe("Values from Open Food Facts.");
  });

  it("keeps the estimate when the cached values do not fit the amount", () => {
    const per100g: CachedFood = {
      ...strips,
      facts: { basis: "per100g", nutrients: strips.facts.nutrients },
    };
    expect(applyCachedFood(parsedStrips, per100g)).toBeNull();
  });

  it("names where the values come from", () => {
    const noteFor = (source: CachedFood["source"], sourceUrl: string | null) =>
      applyCachedFood(parsedStrips, { ...strips, source, sourceUrl })?.note;
    expect(noteFor("usda", null)).toBe("Values from USDA FoodData Central.");
    expect(noteFor("web", null)).toBe("Values from the web.");
    expect(noteFor("web", "not a url")).toBe("Values from the web.");
    expect(noteFor("user", null)).toBe("Values from your saved foods.");
    expect(noteFor("ai_estimate", null)).toBe(
      "Values from an earlier estimate.",
    );
  });
});
