/**
 * The calendar day ("YYYY-MM-DD") it is right now in a time zone.
 *
 * The server runs in UTC: new Date().toISOString() would file a meal eaten
 * at 00:30 in Bucharest under the previous day.
 */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // formatToParts, not format(): the order and separators of format()
  // depend on the locale ("10/15/2026", "15.10.2026"…).
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const { year, month, day } = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${year}-${month}-${day}`;
}

/** "Thursday 15 October" for "2026-10-15". */
export function formatDay(date: string): string {
  // Midnight UTC of that date, formatted in UTC, so no time zone can move it
  // to the day before.
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
