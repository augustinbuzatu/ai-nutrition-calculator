"use server";

import { requireUser } from "@/lib/auth/user";
import { type ParseResult, parseMealDescription } from "./parse";

/** Reads a description for the log page; nothing is saved until the user confirms. */
export async function describeMeal(description: string): Promise<ParseResult> {
  // Each call costs money: only signed-in users may make one.
  await requireUser();
  // The argument comes from the network, whatever its type says.
  if (typeof description !== "string") {
    return { ok: false, error: "Describe what you ate." };
  }
  return parseMealDescription(description);
}
