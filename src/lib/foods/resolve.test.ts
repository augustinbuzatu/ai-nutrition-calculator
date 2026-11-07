import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { takeAiUse } from "@/lib/ai/access";
import type { ParsedMeal } from "@/lib/parser/parse";
import { findPublishedFood, isAgentConfigured } from "./agent";
import type { CachedFood } from "./cache";
import type { PublishedFood } from "./published";
import { saveFood, searchFoods } from "./queries";
import { resolveMeals } from "./resolve";

// The database and the agent are replaced: these tests cover what
// resolveMeals does with their answers. supabase/tests covers the search,
// agent.test.ts and published.test.ts the agent.
vi.mock("./queries", () => ({ searchFoods: vi.fn(), saveFood: vi.fn() }));
vi.mock("@/lib/ai/access", () => ({ takeAiUse: vi.fn() }));
vi.mock("./agent", () => ({
  findPublishedFood: vi.fn(),
  isAgentConfigured: vi.fn(),
}));

const estimate = (name: string, place: string | null = null): ParsedMeal => ({
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
  place,
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

/** What KFC Romania publishes: per 100 g, and what one strip weighs. */
const published: PublishedFood = {
  name: "KFC Crispy Strips",
  place: "KFC",
  facts: {
    basis: "per100g",
    nutrients: { kcal: 252, proteinG: 19.81, carbsG: 11.04, fatG: 13.98 },
    serving: { label: "1 buc.", grams: 30 },
  },
  sourceUrl: "https://www.kfc.ro/meniu/pui/crispy-strips",
};

beforeEach(() => {
  vi.mocked(searchFoods).mockResolvedValue([]);
  vi.mocked(isAgentConfigured).mockReturnValue(true);
  vi.mocked(takeAiUse).mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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
      estimate("KFC Crispy Strips", "KFC"),
      estimate("Hot Wings"),
    ]);

    expect(cached.fields).toMatchObject({ kcal: "130", amount: "3" });
    expect(cached.note).toBe("Values from kfc.ro.");
    expect(estimated).toEqual(estimate("Hot Wings"));
    // The cache knew the strips: no web search, which costs money.
    expect(findPublishedFood).not.toHaveBeenCalled();
  });

  it("looks a named place's food up on its site, and keeps it in the cache", async () => {
    vi.mocked(findPublishedFood).mockResolvedValue({
      ok: true,
      food: published,
    });

    const [meal] = await resolveMeals([estimate("KFC Crispy Strips", "KFC")]);

    expect(findPublishedFood).toHaveBeenCalledWith(
      estimate("KFC Crispy Strips", "KFC"),
    );
    expect(saveFood).toHaveBeenCalledWith(published);
    expect(meal.fields).toMatchObject({
      servingLabel: "1 buc., 30 g",
      kcal: "75.6",
      proteinG: "5.94",
      amount: "3",
    });
    expect(meal.note).toBe("Values from kfc.ro.");
  });

  it("never searches the web for food without a place", async () => {
    const [meal] = await resolveMeals([estimate("Piept de pui")]);

    expect(meal).toEqual(estimate("Piept de pui"));
    expect(findPublishedFood).not.toHaveBeenCalled();
  });

  it("keeps the estimate, and says so, when the site does not have the food", async () => {
    vi.mocked(findPublishedFood).mockResolvedValue({
      ok: false,
      reason: "not-found",
    });

    const [meal] = await resolveMeals([estimate("KFC Twister", "KFC")]);

    expect(meal.fields).toEqual(estimate("KFC Twister", "KFC").fields);
    expect(meal.note).toBe(
      "Assumed regular strips. Not found on kfc.ro, so the values are estimated.",
    );
    expect(saveFood).not.toHaveBeenCalled();
  });

  it("keeps the estimate when the published values do not fit the amount", async () => {
    vi.mocked(findPublishedFood).mockResolvedValue({
      ok: true,
      food: {
        ...published,
        facts: { basis: "per100g", nutrients: published.facts.nutrients },
      },
    });

    const [meal] = await resolveMeals([estimate("KFC Crispy Strips", "KFC")]);

    expect(meal.fields.kcal).toBe("127");
    expect(meal.note).toBe(
      "Assumed regular strips. kfc.ro does not say how much one serving is, so the values are estimated.",
    );
  });

  it("uses the values even when the cache cannot keep them", async () => {
    vi.mocked(findPublishedFood).mockResolvedValue({
      ok: true,
      food: published,
    });
    vi.mocked(saveFood).mockRejectedValue(new Error("connection refused"));

    const [meal] = await resolveMeals([estimate("KFC Crispy Strips", "KFC")]);

    expect(meal.fields.kcal).toBe("75.6");
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("keeps the estimates when the cache cannot be searched", async () => {
    vi.mocked(searchFoods).mockRejectedValue(new Error("connection refused"));

    expect(await resolveMeals([estimate("KFC Crispy Strips")])).toEqual([
      estimate("KFC Crispy Strips"),
    ]);
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("takes one of the day's lookups for each web search, and only then", async () => {
    vi.mocked(findPublishedFood).mockResolvedValue({
      ok: false,
      reason: "not-found",
    });
    vi.mocked(searchFoods).mockImplementation(async (name) =>
      name === "KFC Crispy Strips" ? [strips] : [],
    );

    await resolveMeals([
      estimate("KFC Crispy Strips", "KFC"), // in the cache: no lookup
      estimate("Piept de pui"), // no place: no lookup
      estimate("KFC Twister", "KFC"),
    ]);

    expect(takeAiUse).toHaveBeenCalledTimes(1);
    expect(takeAiUse).toHaveBeenCalledWith("lookup");
  });

  it("keeps the estimate, without searching, once the lookups are used up", async () => {
    vi.mocked(takeAiUse).mockResolvedValue({ ok: false, reason: "user_limit" });

    const [meal] = await resolveMeals([estimate("KFC Twister", "KFC")]);

    expect(findPublishedFood).not.toHaveBeenCalled();
    expect(meal.fields).toEqual(estimate("KFC Twister", "KFC").fields);
    expect(meal.note).toBe(
      "Assumed regular strips. Today's lookups are used up, so kfc.ro was not searched and the values are estimated.",
    );
  });

  it("does not search the web without the Anthropic key", async () => {
    vi.mocked(isAgentConfigured).mockReturnValue(false);

    const [meal] = await resolveMeals([estimate("KFC Crispy Strips", "KFC")]);

    expect(meal).toEqual(estimate("KFC Crispy Strips", "KFC"));
    expect(findPublishedFood).not.toHaveBeenCalled();
  });
});
