import * as z from "zod";
import { MEAL_LIMITS } from "@/lib/meals/form";
import { checkNutritionFacts } from "@/lib/nutrition/check";
import {
  type NutritionFacts,
  type Serving,
  nutritionFactsSchema,
} from "@/lib/nutrition/schemas";
import { isOnSites } from "./places";

// What the web-search agent answers, and the checks that decide whether to
// believe it. The agent reads pages the app does not control, so its answer
// is untrusted input: these checks are plain code, not instructions to it.

/** The agent's answer. Types only, every field required, as strict outputs need. */
export const agentAnswerSchema = z.object({
  found: z.boolean(),
  basis: z.enum(["per100g", "per100ml", "perServing"]).nullable(),
  kcal: z.number().nullable(),
  proteinG: z.number().nullable(),
  carbsG: z.number().nullable(),
  fatG: z.number().nullable(),
  servingLabel: z.string().nullable(),
  servingGrams: z.number().nullable(),
  servingMl: z.number().nullable(),
  sourceUrl: z.string().nullable(),
});

export type AgentAnswer = z.infer<typeof agentAnswerSchema>;

/** A page the agent opened, with its text (null for a PDF, which comes as data). */
export type FetchedPage = { url: string; text: string | null };

/** Values a restaurant or shop publishes, ready for the cache. */
export type PublishedFood = {
  name: string;
  place: string;
  facts: NutritionFacts;
  sourceUrl: string;
};

export type PublishedResult =
  | { ok: true; food: PublishedFood }
  | {
      ok: false;
      reason:
        | "not-found"
        | "off-site"
        | "not-read"
        | "not-on-page"
        | "implausible"
        | "failed";
    };

const fetchResultSchema = z.object({
  type: z.literal("web_fetch_result"),
  url: z.string(),
  content: z.object({
    source: z.object({ type: z.string(), data: z.unknown() }),
  }),
});

/** The pages the agent opened with web_fetch, from the parts of its answer. */
export function fetchedPages(parts: readonly unknown[]): FetchedPage[] {
  const pages: FetchedPage[] = [];
  for (const part of parts) {
    if (!isFetchResult(part)) continue;
    const result = fetchResultSchema.safeParse(part.output);
    if (!result.success) continue;
    const { source } = result.data.content;
    pages.push({
      url: result.data.url,
      text:
        source.type === "text" && typeof source.data === "string"
          ? source.data
          : null,
    });
  }
  return pages;
}

function isFetchResult(part: unknown): part is { output: unknown } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "tool-result" &&
    "toolName" in part &&
    part.toolName === "web_fetch" &&
    "output" in part
  );
}

/**
 * The agent's answer as values to use, or why not. It must have opened the
 * page it names as the source, on the place's official site when the app
 * knows it, and the energy, protein and serving size it reports must appear
 * on that page: an agent that answers from search snippets or memory can
 * invent numbers, and once did (170 kcal for strips published at 252).
 */
export function checkPublishedFood({
  answer,
  pages,
  sites,
  name,
  place,
}: {
  answer: AgentAnswer;
  pages: readonly FetchedPage[];
  /** The place's official sites, or null for a place the app does not know. */
  sites: readonly string[] | null;
  name: string;
  place: string;
}): PublishedResult {
  const { basis, kcal, proteinG, carbsG, fatG, sourceUrl } = answer;
  if (
    !answer.found ||
    basis === null ||
    kcal === null ||
    proteinG === null ||
    carbsG === null ||
    fatG === null ||
    sourceUrl === null
  ) {
    return { ok: false, reason: "not-found" };
  }
  if (sites && !isOnSites(sourceUrl, sites)) {
    return { ok: false, reason: "off-site" };
  }
  const page = pages.find((fetched) => samePage(fetched.url, sourceUrl));
  if (!page) return { ok: false, reason: "not-read" };

  const serving = servingFrom(answer);
  if (page.text !== null) {
    const reported = [kcal, proteinG, serving?.grams, serving?.ml];
    const text = page.text;
    if (
      reported.some((value) => value !== undefined && !appearsIn(text, value))
    ) {
      return { ok: false, reason: "not-on-page" };
    }
  }

  const facts = nutritionFactsSchema.safeParse({
    basis,
    nutrients: { kcal, proteinG, carbsG, fatG },
    ...(serving ? { serving } : {}),
  });
  if (
    !facts.success ||
    checkNutritionFacts(facts.data).some((issue) => issue.severity === "error")
  ) {
    return { ok: false, reason: "implausible" };
  }
  return { ok: true, food: { name, place, facts: facts.data, sourceUrl } };
}

/** One piece or serving, if the answer says what it is and it fits the form. */
function servingFrom(answer: AgentAnswer): Serving | undefined {
  const label = answer.servingLabel?.trim();
  if (!label || label.length > MEAL_LIMITS.servingLabel) return undefined;
  return {
    label,
    ...(answer.servingGrams && answer.servingGrams > 0
      ? { grams: answer.servingGrams }
      : {}),
    ...(answer.servingMl && answer.servingMl > 0
      ? { ml: answer.servingMl }
      : {}),
  };
}

/** Same host (with or without www) and path; the query may differ ("?v=23"). */
function samePage(a: string, b: string): boolean {
  const key = (url: string) => {
    try {
      const { hostname, pathname } = new URL(url);
      return `${hostname.replace(/^www\./, "")}${pathname.replace(/\/$/, "")}`;
    } catch {
      return null;
    }
  };
  const keyA = key(a);
  return keyA !== null && keyA === key(b);
}

/**
 * Whether `value` is written in `text` as a number of its own: 19.81 matches
 * "19,81" and "19.810", 252 matches "252 kcal", but 25 does not match "252".
 */
export function appearsIn(text: string, value: number): boolean {
  const [whole, decimals] = String(value).split(".");
  const pattern = decimals
    ? `${whole}[.,]${decimals}0*`
    : `${whole}(?:[.,]0+)?`;
  return new RegExp(`(?<![\\d.,])${pattern}(?!\\d)`).test(text);
}
