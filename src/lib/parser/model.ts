import { createAnthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/** A model object, not a gateway id string, so middleware can wrap it. */
type Model = Exclude<LanguageModel, string>;

/** The cheapest current model of each provider; `npm run eval` checks they are good enough. */
export const PARSER_MODELS = {
  openai: "gpt-6-luna",
  anthropic: "claude-haiku-5-5",
} as const;

export type ParserProvider = keyof typeof PARSER_MODELS;

/**
 * OpenAI when its key is set, else Claude (used until the OpenAI key is in
 * place), else none: the log page then offers only the manual form.
 */
export function parserProvider(): ParserProvider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.APP_ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/** The model for an id: "claude-…" goes to Anthropic, anything else to OpenAI. */
export function languageModel(modelId: string): Model {
  if (!modelId.startsWith("claude-")) return openai(modelId);
  // Never the provider's defaults, ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL:
  // hosted dev environments often set them for other tools, and that base
  // URL would send the app's key to another tool's endpoint.
  return createAnthropic({
    apiKey: process.env.APP_ANTHROPIC_API_KEY ?? "",
    baseURL: "https://api.anthropic.com/v1",
  })(modelId);
}

/** The model the app uses now. */
export function parserModel(): Model {
  return languageModel(PARSER_MODELS[parserProvider() ?? "openai"]);
}
