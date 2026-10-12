import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The link in the confirmation email ends up here with a one-time code, which
 * is exchanged for a session. The exchange (PKCE) only works in the browser
 * that signed up: it needs a secret that browser kept in a cookie.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/");
  }
  // Expired link, already used, or opened in another browser.
  redirect("/login?error=link");
}
