import { anthropic } from "@ai-sdk/anthropic";
import { wrapLanguageModel } from "ai";
import { afterAll, describe, it } from "vitest";
import { formatNumber } from "@/lib/format";
import {
  PARSER_MODEL,
  isParserConfigured,
  parseMealDescription,
} from "@/lib/parser/parse";
import { CASES } from "./cases";
import { type Grade, gradeCase } from "./grade";

// Runs every case against the real model and prints a report. To compare
// another model: EVAL_MODEL=claude-sonnet-5-5 npm run eval

if (!isParserConfigured()) {
  throw new Error(
    "npm run eval calls Anthropic: add ANTHROPIC_API_KEY to .env.local first.",
  );
}

const modelId = process.env.EVAL_MODEL || PARSER_MODEL;

/** USD per million input and output tokens, from Anthropic's pricing page (October 2026). */
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};

type Call = { inputTokens: number; outputTokens: number; seconds: number };
const calls: Call[] = [];

// Records each call's tokens and time, for the cost and speed in the report.
const model = wrapLanguageModel({
  model: anthropic(modelId),
  middleware: {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate }) => {
      const start = performance.now();
      const result = await doGenerate();
      calls.push({
        inputTokens: result.usage.inputTokens.total ?? 0,
        outputTokens: result.usage.outputTokens.total ?? 0,
        seconds: (performance.now() - start) / 1000,
      });
      return result;
    },
  },
});

const grades = new Map<number, Grade>();

describe.concurrent(`meal parser on ${modelId}`, () => {
  CASES.forEach((testCase, index) => {
    it(`${testCase.description} (${testCase.why})`, async ({ expect }) => {
      const result = await parseMealDescription(testCase.description, model);
      const grade = gradeCase(testCase, result);
      grades.set(index, grade);
      expect(grade.failures).toEqual([]);
    });
  });

  afterAll(() => {
    console.log(report());
  });
});

function report(): string {
  const lines = [`Meal parser eval: ${modelId}`, ""];
  let passed = 0;
  CASES.forEach((testCase, index) => {
    const grade = grades.get(index);
    if (!grade) return;
    if (grade.failures.length === 0) passed += 1;
    lines.push(
      `${grade.failures.length === 0 ? "✓" : "✗"} ${testCase.description}`,
    );
    for (const food of grade.found) lines.push(`    ${food}`);
    for (const failure of grade.failures) lines.push(`    ! ${failure}`);
  });

  const input = sum(calls.map((call) => call.inputTokens));
  const output = sum(calls.map((call) => call.outputTokens));
  const price = PRICES[modelId];
  const cost = price
    ? `$${((input * price[0] + output * price[1]) / 1e6).toFixed(4)}`
    : "cost unknown for this model";
  const seconds = calls.map((call) => call.seconds);
  lines.push(
    "",
    `${passed}/${grades.size} cases passed`,
    `${calls.length} calls · ${formatNumber(input)} input + ${formatNumber(output)} output tokens · ${cost}`,
    `${(sum(seconds) / Math.max(seconds.length, 1)).toFixed(1)} s per call on average, ${Math.max(0, ...seconds).toFixed(1)} s at most`,
  );
  return lines.join("\n");
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
