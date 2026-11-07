import type { Database } from "@/lib/supabase/database.types";

// What the database says about using the AI, in the app's words. The rules
// themselves (approved accounts, daily limits) live in Postgres: see the
// ai_access migration. Pure functions, so the messages are tested.

/** A description read by the model, or a food looked up on a site. */
export type AiUse = Database["public"]["Enums"]["ai_use"];

export type AiRefusal =
  | "not_approved"
  | "user_limit"
  | "daily_limit"
  // The limits could not be checked: no AI then, since it costs money.
  | "unavailable";

export type AiUseResult = { ok: true } | { ok: false; reason: AiRefusal };

/** What use_ai answered, as a result; anything unexpected is refused. */
export function toAiUseResult(answer: unknown): AiUseResult {
  switch (answer) {
    case "ok":
      return { ok: true };
    case "not_approved":
    case "user_limit":
    case "daily_limit":
      return { ok: false, reason: answer };
    default:
      return { ok: false, reason: "unavailable" };
  }
}

/** Why a description was not read, for the log page. */
export function descriptionRefusal(reason: AiRefusal): string {
  switch (reason) {
    case "not_approved":
      return "Describing meals is on for approved accounts only. Ask the app's owner to turn it on; until then, add foods by hand.";
    case "user_limit":
      return "You have used today's descriptions. Add foods by hand, or describe more tomorrow.";
    case "daily_limit":
      return "The app has reached today's limit for everyone. Add foods by hand, or describe more tomorrow.";
    case "unavailable":
      return "Describing meals is not available right now. Add foods by hand, or try again later.";
  }
}

/**
 * For an approved account with nothing left today, from its own limit or
 * everyone's: the allowance does not say which.
 */
export const NO_DESCRIPTIONS_LEFT =
  "No descriptions are left for today. Add foods by hand, or describe more tomorrow.";

/** Why a food was not looked up on `site`, for its card's note. */
export function lookupRefusal(reason: AiRefusal, site: string): string {
  return reason === "user_limit" || reason === "daily_limit"
    ? `Today's lookups are used up, so ${site} was not searched and the values are estimated.`
    : `${site} could not be searched right now, so the values are estimated.`;
}
