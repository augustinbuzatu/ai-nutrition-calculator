import { describe, expect, it } from "vitest";
import {
  type AgentAnswer,
  type FetchedPage,
  appearsIn,
  checkPublishedFood,
  fetchedPages,
} from "./published";

/** What KFC Romania's Crispy Strips page says (November 2026). */
const kfcPage: FetchedPage = {
  url: "https://www.kfc.ro/meniu/pui/crispy-strips",
  text: "Declarație nutrițională per 100g. Crispy Strips® 1053 252 13.98 1.81 11.04 <0.5 1,36 19.81 1,40. 1 buc. 30g / 3 buc. 90g",
};

const answer: AgentAnswer = {
  found: true,
  basis: "per100g",
  kcal: 252,
  proteinG: 19.81,
  carbsG: 11.04,
  fatG: 13.98,
  servingLabel: "1 buc.",
  servingGrams: 30,
  servingMl: null,
  sourceUrl: "https://www.kfc.ro/meniu/pui/crispy-strips",
};

const check = (
  overrides: Partial<AgentAnswer>,
  pages: FetchedPage[] = [kfcPage],
  sites: readonly string[] | null = ["kfc.ro"],
) =>
  checkPublishedFood({
    answer: { ...answer, ...overrides },
    pages,
    sites,
    name: "KFC Crispy Strips",
    place: "KFC",
  });

describe("checkPublishedFood", () => {
  it("accepts values read on the place's own page", () => {
    expect(check({})).toEqual({
      ok: true,
      food: {
        name: "KFC Crispy Strips",
        place: "KFC",
        facts: {
          basis: "per100g",
          nutrients: { kcal: 252, proteinG: 19.81, carbsG: 11.04, fatG: 13.98 },
          serving: { label: "1 buc.", grams: 30 },
        },
        sourceUrl: "https://www.kfc.ro/meniu/pui/crispy-strips",
      },
    });
  });

  it("treats a missing value as not found", () => {
    expect(check({ found: false })).toEqual({ ok: false, reason: "not-found" });
    expect(check({ kcal: null })).toEqual({ ok: false, reason: "not-found" });
    expect(check({ sourceUrl: null })).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("refuses a source off the place's official site", () => {
    const blog = "https://some-blog.example/kfc-strips";
    expect(
      check({ sourceUrl: blog }, [{ url: blog, text: kfcPage.text }]),
    ).toEqual({ ok: false, reason: "off-site" });
    // A place the app does not know may use any site.
    expect(
      check({ sourceUrl: blog }, [{ url: blog, text: kfcPage.text }], null).ok,
    ).toBe(true);
  });

  it("refuses values from a page the agent never opened", () => {
    // What happened once: values from search snippets, with no page read.
    expect(check({ kcal: 170, proteinG: 14.21 }, [])).toEqual({
      ok: false,
      reason: "not-read",
    });
  });

  it("refuses energy, protein or a serving size the page does not show", () => {
    expect(check({ kcal: 170 })).toEqual({ ok: false, reason: "not-on-page" });
    expect(check({ proteinG: 14.21 })).toEqual({
      ok: false,
      reason: "not-on-page",
    });
    expect(check({ servingGrams: 90 }).ok).toBe(true);
    expect(check({ servingGrams: 45 })).toEqual({
      ok: false,
      reason: "not-on-page",
    });
  });

  it("trusts a PDF it cannot read as text, once the agent opened it", () => {
    const pdf = "https://kfc.ro/documente/kfc-informatii-produse.pdf?v=23";
    expect(
      check(
        { sourceUrl: "https://kfc.ro/documente/kfc-informatii-produse.pdf" },
        [{ url: pdf, text: null }],
      ).ok,
    ).toBe(true);
  });

  it("refuses impossible values, whatever the page says", () => {
    const page = { ...kfcPage, text: `${kfcPage.text} 2500 kcal 300 g` };
    expect(check({ kcal: 2500 }, [page])).toEqual({
      ok: false,
      reason: "implausible",
    });
  });

  it("drops a serving it cannot use, and needs one for values per serving", () => {
    const long = "1 portie mare, cu sos, cartofi si bautura la alegere, 400 g";
    const kept = check({ servingLabel: long });
    expect(kept.ok).toBe(true);
    expect(kept.ok && kept.food.facts.serving).toBeUndefined();
    expect(check({ basis: "perServing", servingLabel: null })).toEqual({
      ok: false,
      reason: "implausible",
    });
  });
});

describe("appearsIn", () => {
  it("finds a number written as a number of its own", () => {
    expect(appearsIn("19,81 g", 19.81)).toBe(true);
    expect(appearsIn("1053 kJ/252 kcal", 252)).toBe(true);
    expect(appearsIn("sare 1,40", 1.4)).toBe(true);
    expect(appearsIn("252.0 kcal", 252)).toBe(true);
    expect(appearsIn("1 buc. 30g", 30)).toBe(true);
  });

  it("does not find a number inside another one", () => {
    expect(appearsIn("252 kcal", 25)).toBe(false);
    expect(appearsIn("1252 kcal", 252)).toBe(false);
    expect(appearsIn("19.815", 19.81)).toBe(false);
    expect(appearsIn("0.252", 252)).toBe(false);
  });
});

describe("fetchedPages", () => {
  it("collects the pages web_fetch opened, with their text when it is text", () => {
    expect(
      fetchedPages([
        { type: "text", text: "{}" },
        { type: "tool-result", toolName: "web_search", output: [] },
        {
          type: "tool-result",
          toolName: "web_fetch",
          output: {
            type: "web_fetch_result",
            url: kfcPage.url,
            content: {
              type: "document",
              source: { type: "text", mediaType: "text/plain", data: "252" },
            },
          },
        },
        {
          type: "tool-result",
          toolName: "web_fetch",
          output: {
            type: "web_fetch_result",
            url: "https://kfc.ro/a.pdf",
            content: {
              type: "document",
              source: {
                type: "base64",
                mediaType: "application/pdf",
                data: "JVBE",
              },
            },
          },
        },
        // A fetch that failed has no page.
        {
          type: "tool-result",
          toolName: "web_fetch",
          output: {
            type: "web_fetch_tool_result_error",
            errorCode: "url_not_accessible",
          },
        },
      ]),
    ).toEqual([
      { url: kfcPage.url, text: "252" },
      { url: "https://kfc.ro/a.pdf", text: null },
    ]);
  });
});
