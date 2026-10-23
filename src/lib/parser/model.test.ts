import { afterEach, describe, expect, it, vi } from "vitest";
import { PARSER_MODELS, languageModel, parserProvider } from "./model";

describe("parserProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers OpenAI, then Claude, then none", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("APP_ANTHROPIC_API_KEY", "sk-ant-app");
    expect(parserProvider()).toBe("openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(parserProvider()).toBe("anthropic");
    vi.stubEnv("APP_ANTHROPIC_API_KEY", "");
    expect(parserProvider()).toBeNull();
  });
});

describe("languageModel", () => {
  it.each([
    [PARSER_MODELS.openai, "openai"],
    ["gpt-6-sol", "openai"],
    [PARSER_MODELS.anthropic, "anthropic"],
    ["claude-opus-5-5", "anthropic"],
  ])("sends %s to %s", (modelId, provider) => {
    const model = languageModel(modelId);
    expect(model.provider.startsWith(provider)).toBe(true);
    expect(model.modelId).toBe(modelId);
  });
});
