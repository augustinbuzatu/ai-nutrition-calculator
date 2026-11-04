import { afterEach, describe, expect, it, vi } from "vitest";
import type { ParsedMeal } from "@/lib/parser/parse";
import type { CachedFood } from "./cache";
import { searchFoods } from "./queries";
import { resolveMeals } from "./resolve";

// The database search is replaced: these tests cover what resolveMeals does
// with its answers (supabase/tests covers the search itself).
vi.mock("./queries", () => ({ searchFoods: vi.fn() }));

const estimate = (name: string): ParsedMeal => ({
  fields: {
    name,
    basis: "perServing",
    servingLabel: "1 strip",
    kcal: "127",
    proteinG: "7",
    carbsG: "9",
    fatG: "7",
    amount: "3",
    unit: "serving",
  },
  note: "Assumed regular strips.",
});

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

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("resolveMeals", () => {
  it("takes each food's values from the cache when it holds the same food", async () => {
    vi.mocked(searchFoods).mockImplementation(async (name) =>
      name === "KFC Crispy Strips" ? [strips] : [],
    );

    const [cached, estimated] = await resolveMeals([
      estimate("KFC Crispy Strips"),
      estimate("Hot Wings"),
    ]);

    expect(cached.fields).toMatchObject({ kcal: "130", amount: "3" });
    expect(cached.note).toBe("Values from kfc.ro.");
    expect(estimated).toEqual(estimate("Hot Wings"));
  });

  it("keeps the estimates when the cache cannot be searched", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(searchFoods).mockRejectedValue(new Error("connection refused"));

    expect(await resolveMeals([estimate("KFC Crispy Strips")])).toEqual([
      estimate("KFC Crispy Strips"),
    ]);
    expect(console.error).toHaveBeenCalledOnce();
  });
});
