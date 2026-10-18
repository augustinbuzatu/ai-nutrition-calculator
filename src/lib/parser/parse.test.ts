import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseMeal } from "@/lib/meals/form";
import { INSTRUCTIONS } from "./instructions";
import { MAX_DESCRIPTION_LENGTH, parseMealDescription } from "./parse";

const chicken = {
  name: "Piept de pui",
  amount: 150,
  unit: "g",
  servingLabel: null,
  kcal: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
  note: null,
};
const eggs = {
  name: "Ouă fierte",
  amount: 2,
  unit: "serving",
  servingLabel: "1 ou",
  kcal: 78,
  proteinG: 6.3,
  carbsG: 0.6,
  fatG: 5.3,
  note: "Assumed large eggs.",
};

/** A model that answers every call with this text. */
function modelAnswering(text: string) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 500,
          noCache: 500,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 100, text: 100, reasoning: undefined },
      },
      warnings: [],
    },
  });
}

const modelFinding = (...foods: object[]) =>
  modelAnswering(JSON.stringify({ foods }));

describe("parseMealDescription", () => {
  beforeEach(() => {
    // Failures are logged on purpose; keep them out of the test output.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("turns each food into the meal form's fields", async () => {
    const result = await parseMealDescription(
      "150 g piept de pui și 2 ouă fierte",
      modelFinding(chicken, eggs),
    );

    expect(result).toEqual({
      ok: true,
      meals: [
        {
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
        },
        {
          fields: {
            name: "Ouă fierte",
            basis: "perServing",
            servingLabel: "1 ou",
            kcal: "78",
            proteinG: "6.3",
            carbsG: "0.6",
            fatG: "5.3",
            amount: "2",
            unit: "serving",
          },
          note: "Assumed large eggs.",
        },
      ],
    });
  });

  it.each([
    ["g", "per100g"],
    ["kg", "per100g"],
    ["ml", "per100ml"],
    ["l", "per100ml"],
    ["serving", "perServing"],
  ])("gives %s the basis %s, which the form accepts", async (unit, basis) => {
    const result = await parseMealDescription(
      "something",
      modelFinding({ ...chicken, unit, servingLabel: "1 piece" }),
    );

    if (!result.ok) throw new Error(result.error);
    const { fields } = result.meals[0];
    expect(fields.basis).toBe(basis);
    expect(parseMeal(fields).ok).toBe(true);
  });

  it("keeps a serving label only for servings", async () => {
    const result = await parseMealDescription(
      "a cup of rice and an egg",
      modelFinding(
        { ...chicken, servingLabel: "1 cup" },
        { ...eggs, servingLabel: null },
      ),
    );

    if (!result.ok) throw new Error(result.error);
    expect(result.meals.map((meal) => meal.fields.servingLabel)).toEqual([
      "",
      "",
    ]);
    // The form then asks for the missing one.
    expect(parseMeal(result.meals[1].fields)).toMatchObject({
      ok: false,
      errors: { servingLabel: "Say what one serving is, like “1 burger”." },
    });
  });

  it("rounds values to two decimals", async () => {
    const result = await parseMealDescription(
      "a can of cola",
      modelFinding({
        ...chicken,
        amount: 0.33,
        unit: "l",
        kcal: 42.00000000000001,
        carbsG: 10.6666,
        fatG: 0.005,
      }),
    );

    if (!result.ok) throw new Error(result.error);
    expect(result.meals[0].fields).toMatchObject({
      amount: "0.33",
      kcal: "42",
      carbsG: "10.67",
      fatG: "0.01",
    });
  });

  it("leaves odd values for the form to flag, food by food", async () => {
    const result = await parseMealDescription(
      "chicken and eggs",
      modelFinding({ ...chicken, kcal: -5 }, eggs),
    );

    if (!result.ok) throw new Error(result.error);
    expect(result.meals).toHaveLength(2);
    expect(parseMeal(result.meals[0].fields)).toMatchObject({
      ok: false,
      errors: { kcal: "Enter a number, like 165." },
    });
    expect(parseMeal(result.meals[1].fields).ok).toBe(true);
  });

  it("sends the description as the user's message, after the instructions", async () => {
    const model = modelFinding(chicken);
    await parseMealDescription("  150 g piept de pui \n", model);

    expect(model.doGenerateCalls).toHaveLength(1);
    expect(model.doGenerateCalls[0].prompt).toEqual([
      { role: "system", content: INSTRUCTIONS },
      {
        role: "user",
        content: [{ type: "text", text: "150 g piept de pui" }],
      },
    ]);
  });

  it("does not call the model for an empty or a too long description", async () => {
    const model = modelFinding(chicken);

    expect(await parseMealDescription(" \n ", model)).toEqual({
      ok: false,
      error: "Describe what you ate.",
    });
    expect(
      await parseMealDescription("a".repeat(MAX_DESCRIPTION_LENGTH + 1), model),
    ).toEqual({ ok: false, error: "Use at most 500 characters." });
    expect(model.doGenerateCalls).toHaveLength(0);

    await parseMealDescription("a".repeat(MAX_DESCRIPTION_LENGTH), model);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("says so when the text has no food in it", async () => {
    expect(
      await parseMealDescription("what's the weather?", modelFinding()),
    ).toEqual({
      ok: false,
      error:
        "No food or drink found. Try something like “150 g chicken breast and 200 g rice”.",
    });
  });

  const unreadable = {
    ok: false,
    error: "Your meal could not be read. Please try again, or add it by hand.",
  };

  it.each([
    ["is not JSON", "Sorry, I can't help with that."],
    ["breaks the schema", JSON.stringify({ foods: [{ name: "Pizza" }] })],
    [
      "uses a unit the app does not know",
      JSON.stringify({ foods: [{ ...chicken, unit: "cup" }] }),
    ],
  ])("fails gently when the answer %s", async (_case, text) => {
    expect(await parseMealDescription("pizza", modelAnswering(text))).toEqual(
      unreadable,
    );
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("fails gently when the provider does", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("Incorrect API key provided");
      },
    });

    expect(await parseMealDescription("pizza", model)).toEqual(unreadable);
    expect(console.error).toHaveBeenCalledOnce();
  });
});

describe("parseMealDescription with OpenAI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks for strict JSON, low reasoning and no stored response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () =>
        Response.json({
          id: "resp_1",
          created_at: 1_760_000_000,
          model: "gpt-6-luna",
          output: [
            {
              type: "message",
              role: "assistant",
              id: "msg_1",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({ foods: [chicken] }),
                  annotations: [],
                },
              ],
            },
          ],
          usage: { input_tokens: 500, output_tokens: 100 },
        }),
    );
    vi.stubGlobal("fetch", fetch);

    const result = await parseMealDescription("150 g piept de pui");

    expect(result).toMatchObject({
      ok: true,
      meals: [{ fields: { name: "Piept de pui", kcal: "165" } }],
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer sk-test",
    );
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: "gpt-6-luna",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 4000,
      text: { format: { type: "json_schema", strict: true } },
    });
    // No summaries of the model's reasoning: nothing reads them.
    expect(body.reasoning).not.toHaveProperty("summary");
  });
});
