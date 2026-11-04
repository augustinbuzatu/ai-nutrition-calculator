import type { LanguageModelV4Content } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedMeal } from "@/lib/parser/parse";
import { AGENT_INSTRUCTIONS, findPublishedFood } from "./agent";

const PAGE = "https://www.kfc.ro/meniu/pui/crispy-strips";

const strips: ParsedMeal & { place: string } = {
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
  note: null,
  place: "KFC",
};

const answer = {
  found: true,
  basis: "per100g",
  kcal: 252,
  proteinG: 19.81,
  carbsG: 11.04,
  fatG: 13.98,
  servingLabel: "1 buc.",
  servingGrams: 30,
  servingMl: null,
  sourceUrl: PAGE,
};

/** A model that searched, opened `PAGE` with this text, and answered. */
function agentAnswering(pageText: string, reply: object = answer) {
  const content: LanguageModelV4Content[] = [
    {
      type: "tool-call",
      toolCallId: "fetch-1",
      toolName: "web_fetch",
      input: JSON.stringify({ url: PAGE }),
      providerExecuted: true,
    },
    {
      type: "tool-result",
      toolCallId: "fetch-1",
      toolName: "web_fetch",
      result: {
        type: "web_fetch_result",
        url: PAGE,
        content: {
          type: "document",
          source: { type: "text", mediaType: "text/plain", data: pageText },
        },
      },
    },
    { type: "text", text: JSON.stringify(reply) },
  ];
  return new MockLanguageModelV4({
    doGenerate: {
      content,
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 40_000,
          noCache: 40_000,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 800, text: 200, reasoning: 600 },
      },
      warnings: [],
    },
  });
}

const kfcText =
  "Crispy Strips® 1053 252 13.98 1.81 11.04 <0.5 1,36 19.81 1,40. 1 buc. 30g / 3 buc. 90g";

describe("findPublishedFood", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns the values the agent read on the place's page", async () => {
    expect(await findPublishedFood(strips, agentAnswering(kfcText))).toEqual({
      ok: true,
      food: {
        name: "KFC Crispy Strips",
        place: "KFC",
        facts: {
          basis: "per100g",
          nutrients: { kcal: 252, proteinG: 19.81, carbsG: 11.04, fatG: 13.98 },
          serving: { label: "1 buc.", grams: 30 },
        },
        sourceUrl: PAGE,
      },
    });
  });

  it("refuses values the page it opened does not show", async () => {
    expect(
      await findPublishedFood(
        strips,
        agentAnswering(kfcText, { ...answer, kcal: 170 }),
      ),
    ).toEqual({ ok: false, reason: "not-on-page" });
  });

  it("searches only the place's official site, with the food as the message", async () => {
    const model = agentAnswering(kfcText);
    await findPublishedFood(strips, model);

    const [call] = model.doGenerateCalls;
    expect(call.prompt).toEqual([
      { role: "system", content: AGENT_INSTRUCTIONS },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Product: KFC Crispy Strips\nFrom: KFC (official site: kfc.ro)\nEaten: 3 × 1 fâșie",
          },
        ],
      },
    ]);
    expect(call.tools).toMatchObject([
      {
        type: "provider",
        name: "web_search",
        args: { maxUses: 2, allowedDomains: ["kfc.ro"] },
      },
      {
        type: "provider",
        name: "web_fetch",
        args: { maxUses: 2, allowedDomains: ["kfc.ro"] },
      },
    ]);
  });

  it("searches the whole web for a place it does not know", async () => {
    const model = agentAnswering(kfcText);
    await findPublishedFood({ ...strips, place: "Bistro Ana" }, model);

    const { tools = [] } = model.doGenerateCalls[0];
    expect(tools).toHaveLength(2);
    for (const tool of tools) {
      expect(tool.type === "provider" && tool.args).not.toHaveProperty(
        "allowedDomains",
      );
    }
  });

  it("reports a failed call instead of throwing", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("web search is disabled for this organization");
      },
    });
    expect(await findPublishedFood(strips, model)).toEqual({
      ok: false,
      reason: "failed",
    });
    expect(console.error).toHaveBeenCalledOnce();
  });
});
