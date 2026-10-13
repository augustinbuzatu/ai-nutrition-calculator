import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | undefined };

/**
 * The signed-in user, or null. getClaims() verifies the token's signature, so
 * the id can be trusted (unlike getSession(), which only decodes the cookie).
 * cache() runs it once per request, however many components ask.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return { id: data.claims.sub, email: data.claims.email };
});

/**
 * The signed-in user, or a redirect to /login. Data functions call this
 * themselves instead of trusting the proxy: a matcher change could skip it.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
