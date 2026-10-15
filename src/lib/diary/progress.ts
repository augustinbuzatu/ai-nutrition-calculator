import { formatNumber } from "@/lib/format";

/**
 * Calories are a limit to stay under; protein is a target to reach. Going
 * over is a warning for the first, and good news for the second.
 */
export type GoalKind = "limit" | "target";

export type Progress = {
  /** How full the bar is: a whole number from 0 to 100. */
  percent: number;
  /** For example "1,240 kcal left", "120 kcal over", "40 g to go". */
  status: string;
  /** A limit was exceeded, so the status is shown as a warning. */
  over: boolean;
};

/**
 * @param value what was eaten, as displayed (already rounded), so the status
 *   adds up with the numbers on screen.
 */
export function describeProgress(
  value: number,
  goal: number,
  unit: string,
  kind: GoalKind,
): Progress {
  // Whole: screen readers announce aria-valuenow, and 50.14999999999999 is noise.
  const percent = Math.min(Math.round((value / goal) * 100), 100);
  // No rounding needed: formatNumber shows at most 3 decimals, which hides
  // floating-point noise such as 150 - 86.1 = 63.900000000000006.
  const remaining = goal - value;

  if (kind === "target") {
    const status =
      remaining > 0
        ? `${formatNumber(remaining)} ${unit} to go`
        : "Goal reached";
    return { percent, status, over: false };
  }
  if (remaining < 0) {
    const status = `${formatNumber(-remaining)} ${unit} over`;
    return { percent, status, over: true };
  }
  const status = `${formatNumber(remaining)} ${unit} left`;
  return { percent, status, over: false };
}
