import { describe, expect, it } from "vitest";
import { describeProgress } from "./progress";

describe("describeProgress for a limit (calories)", () => {
  it("says how much is left", () => {
    expect(describeProgress(760, 2000, "kcal", "limit")).toEqual({
      percent: 38,
      status: "1,240 kcal left",
      over: false,
    });
  });

  it("gives the bar a whole percentage (1,003 / 2,000 is 50.15%)", () => {
    expect(describeProgress(1003, 2000, "kcal", "limit").percent).toBe(50);
  });

  it("says 0 left when the goal is hit exactly", () => {
    expect(describeProgress(2000, 2000, "kcal", "limit")).toEqual({
      percent: 100,
      status: "0 kcal left",
      over: false,
    });
  });

  it("warns when the limit is passed, with the bar full rather than overflowing", () => {
    expect(describeProgress(2120, 2000, "kcal", "limit")).toEqual({
      percent: 100,
      status: "120 kcal over",
      over: true,
    });
  });
});

describe("describeProgress for a target (protein)", () => {
  it("says how much is still to go, keeping the decimal", () => {
    expect(describeProgress(46.5, 150, "g", "target")).toEqual({
      percent: 31,
      status: "103.5 g to go",
      over: false,
    });
  });

  it("shows no floating-point noise (150 - 86.1 is 63.900000000000006)", () => {
    expect(describeProgress(86.1, 150, "g", "target").status).toBe(
      "63.9 g to go",
    );
  });

  it("counts going over a target as good news, not a warning", () => {
    expect(describeProgress(160, 150, "g", "target")).toEqual({
      percent: 100,
      status: "Goal reached",
      over: false,
    });
  });
});
