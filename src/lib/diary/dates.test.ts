import { describe, expect, it } from "vitest";
import { formatDay, todayIn } from "./dates";

describe("todayIn", () => {
  it("files a meal at 00:30 in Bucharest under the new day, while UTC is still on the old one", () => {
    const now = new Date("2026-10-14T21:30:00Z"); // 00:30 in Bucharest (UTC+3 in summer time)
    expect(todayIn("Europe/Bucharest", now)).toBe("2026-10-15");
    expect(todayIn("UTC", now)).toBe("2026-10-14");
  });

  it("follows winter time too, across the new year", () => {
    const now = new Date("2026-12-31T22:30:00Z"); // 00:30 in Bucharest (UTC+2 in winter)
    expect(todayIn("Europe/Bucharest", now)).toBe("2027-01-01");
  });

  it("works west of UTC, where the local day starts later", () => {
    const now = new Date("2026-10-15T02:00:00Z"); // 22:00 the evening before in New York
    expect(todayIn("America/New_York", now)).toBe("2026-10-14");
  });
});

describe("formatDay", () => {
  it("names the weekday, day and month", () => {
    expect(formatDay("2026-10-15")).toBe("Thursday 15 October");
  });
});
