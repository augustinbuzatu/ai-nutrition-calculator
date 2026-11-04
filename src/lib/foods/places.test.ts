import { describe, expect, it } from "vitest";
import { isOnSites, officialSites } from "./places";

describe("officialSites", () => {
  it("knows a chain however its name is written", () => {
    expect(officialSites("KFC")).toEqual(["kfc.ro"]);
    expect(officialSites("kfc România")).toEqual(["kfc.ro"]);
    expect(officialSites("McDonald's")).toEqual(["mcdonalds.ro"]);
    expect(officialSites("Mega Image")).toEqual(["mega-image.ro"]);
    expect(officialSites("mega-image")).toEqual(["mega-image.ro"]);
  });

  it("does not know other places", () => {
    expect(officialSites("Bistro Ana")).toBeNull();
    expect(officialSites("")).toBeNull();
  });
});

describe("isOnSites", () => {
  it("accepts the site and its subdomains, nothing else", () => {
    expect(isOnSites("https://kfc.ro/a.pdf", ["kfc.ro"])).toBe(true);
    expect(isOnSites("https://www.kfc.ro/meniu", ["kfc.ro"])).toBe(true);
    expect(isOnSites("https://fakekfc.ro/meniu", ["kfc.ro"])).toBe(false);
    expect(isOnSites("https://kfc.ro.evil.example/", ["kfc.ro"])).toBe(false);
    expect(isOnSites("not a url", ["kfc.ro"])).toBe(false);
  });
});
