import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { type AiUse, type AiUseResult, toAiUseResult } from "./limits";

export type AiAllowance = {
  /** The owner has turned the AI on for this account. */
  approved: boolean;
  descriptionsLeft: number;
  lookupsLeft: number;
};

const NO_ALLOWANCE: AiAllowance = {
  approved: false,
  descriptionsLeft: 0,
  lookupsLeft: 0,
};

/** What the signed-in user may still do with the AI today. */
export async function getAiAllowance(): Promise<AiAllowance> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ai_allowance");
  const row = data?.[0];
  if (error || !row) {
    // Without the limits, no AI: it costs money. The log page then offers
    // the manual form, and the log says why.
    console.error("The AI allowance could not be read:", error);
    return NO_ALLOWANCE;
  }
  return {
    approved: row.approved,
    descriptionsLeft: row.descriptions_left,
    lookupsLeft: row.lookups_left,
  };
}

/**
 * Takes one daily use of the AI for the signed-in user, before the call that
 * costs money. The database counts and refuses; this only asks.
 */
export async function takeAiUse(kind: AiUse): Promise<AiUseResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("use_ai", { use_kind: kind });
  if (error) {
    console.error("An AI use could not be counted:", error);
    return { ok: false, reason: "unavailable" };
  }
  return toAiUseResult(data);
}
