import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { takeAiUse } from "@/lib/ai/access";
import { resolveMeals } from "@/lib/foods/resolve";
import { describeMeal } from "./actions";
import { type ParsedMeal, parseMealDescription } from "./parse";

// What describeMeal does before anything costs money; the parser, the limits
// and the cache have their own tests.
vi.mock("@/lib/auth/user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "a@example.com" })),
}));
vi.mock("@/lib/ai/access", () => ({ takeAiUse: vi.fn() }));
vi.mock("@/lib/foods/resolve", () => ({ resolveMeals: vi.fn() }));
vi.mock("./parse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./parse")>()),
  parseMealDescription: vi.fn(),
}));

const meal: ParsedMeal = {
  fields: {
    name: "Piept de pui",
    basis: "per100g",
    servingLabel: "",
    kcal: "165",
    proteinG: "31",
    carbsG: "0",
    fatG: "3.6",
    amount: "150",
    unit: "g",
  },
  note: null,
  place: null,
};

beforeEach(() => {
  vi.mocked(takeAiUse).mockResolvedValue({ ok: true });
  vi.mocked(parseMealDescription).mockResolvedValue({
    ok: true,
    meals: [meal],
  });
  vi.mocked(resolveMeals).mockImplementation(async (meals) => meals);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("describeMeal", () => {
  it("takes a daily use, then reads the meal and resolves its foods", async () => {
    expect(await describeMeal("150 g piept de pui")).toEqual({
      ok: true,
      meals: [meal],
    });
    expect(takeAiUse).toHaveBeenCalledWith("description");
    expect(parseMealDescription).toHaveBeenCalledWith("150 g piept de pui");
  });

  it("does not take a use for a description it cannot read", async () => {
    expect(await describeMeal("   ")).toEqual({
      ok: false,
      error: "Describe what you ate.",
    });
    expect(takeAiUse).not.toHaveBeenCalled();
    expect(parseMealDescription).not.toHaveBeenCalled();
  });

  it("does not call the model when the account may not use it", async () => {
    vi.mocked(takeAiUse).mockResolvedValue({
      ok: false,
      reason: "not_approved",
    });

    const result = await describeMeal("150 g piept de pui");

    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toMatch(/approved accounts/);
    expect(parseMealDescription).not.toHaveBeenCalled();
  });
});
