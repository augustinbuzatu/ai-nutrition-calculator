import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * A Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts as the signed-in user (their session lives in cookies), so every
 * query goes through row level security. Create one per request: never share
 * it between requests, or one user could end up with another user's session.
 *
 * <Database> types every query: a typo in a column name fails `npm run typecheck`.
 */
export async function createClient() {
  // cookies() first: it marks the page as dynamic (rendered per request), so
  // `next build` never prerenders it and never needs the Supabase settings.
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: the proxy
          // already refreshed the session before the page started rendering.
        }
      },
    },
  });
}
