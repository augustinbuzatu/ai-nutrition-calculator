import { describe, expect, it } from "vitest";
import { isKeyOf, parseNumberInput } from "./input";

describe("parseNumberInput", () => {
  it("reads whole numbers and decimals, with a point or a comma", () => {
    expect(parseNumberInput(" 150 ", "whole")).toBe(150);
    expect(parseNumberInput("72.5", "decimal")).toBe(72.5);
    expect(parseNumberInput("72,5", "decimal")).toBe(72.5);
  });

  it("tells an empty field apart from a wrong one", () => {
    expect(parseNumberInput("  ", "decimal")).toBe("empty");
    expect(parseNumberInput("abc", "decimal")).toBe("invalid");
  });

  it.each(["1e3", "0x10", "-5", "+5", "1.", ".5"])(
    "rejects %j, which Number() would accept",
    (text) => {
      expect(parseNumberInput(text, "decimal")).toBe("invalid");
    },
  );

  it("refuses to guess whether a comma before three digits separates thousands", () => {
    expect(parseNumberInput("1,200", "decimal")).toBe("ambiguous");
    expect(parseNumberInput("0,125", "decimal")).toBe(0.125); // a leading 0 is never thousands
    expect(parseNumberInput("1,25", "decimal")).toBe(1.25);
  });

  it("rejects decimals where only whole numbers make sense", () => {
    expect(parseNumberInput("30.5", "whole")).toBe("invalid");
  });
});

describe("isKeyOf", () => {
  const options = { g: "grams" };

  it("accepts the object's own keys only", () => {
    expect(isKeyOf("g", options)).toBe(true);
    expect(isKeyOf("kg", options)).toBe(false);
    expect(isKeyOf("toString", options)).toBe(false);
  });
});
