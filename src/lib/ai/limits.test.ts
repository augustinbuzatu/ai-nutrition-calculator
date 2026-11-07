import { describe, expect, it } from "vitest";
import {
  type AiRefusal,
  descriptionRefusal,
  lookupRefusal,
  toAiUseResult,
} from "./limits";

describe("toAiUseResult", () => {
  it("reads what use_ai answers", () => {
    expect(toAiUseResult("ok")).toEqual({ ok: true });
    expect(toAiUseResult("not_approved")).toEqual({
      ok: false,
      reason: "not_approved",
    });
    expect(toAiUseResult("user_limit")).toEqual({
      ok: false,
      reason: "user_limit",
    });
    expect(toAiUseResult("daily_limit")).toEqual({
      ok: false,
      reason: "daily_limit",
    });
  });

  it("refuses anything else, since the AI costs money", () => {
    for (const answer of [null, undefined, "", "OK", true, 1]) {
      expect(toAiUseResult(answer)).toEqual({
        ok: false,
        reason: "unavailable",
      });
    }
  });
});

describe("the messages", () => {
  const reasons: AiRefusal[] = [
    "not_approved",
    "user_limit",
    "daily_limit",
    "unavailable",
  ];

  it("say why a description was not read, and offer the manual form", () => {
    const messages = reasons.map(descriptionRefusal);
    expect(new Set(messages).size).toBe(reasons.length);
    for (const message of messages) expect(message).toMatch(/by hand/);
    expect(descriptionRefusal("not_approved")).toMatch(/approved accounts/);
  });

  it("say on the card why a food was not looked up", () => {
    expect(lookupRefusal("user_limit", "kfc.ro")).toBe(
      "Today's lookups are used up, so kfc.ro was not searched and the values are estimated.",
    );
    expect(lookupRefusal("daily_limit", "kfc.ro")).toBe(
      lookupRefusal("user_limit", "kfc.ro"),
    );
    expect(lookupRefusal("unavailable", "kfc.ro")).toBe(
      "kfc.ro could not be searched right now, so the values are estimated.",
    );
  });
});
