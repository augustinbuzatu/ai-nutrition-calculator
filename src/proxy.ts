import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthRedirect } from "@/lib/auth/routes";
import { getSupabaseConfig } from "@/lib/supabase/config";

type Cookie = { name: string; value: string; options: CookieOptions };

/**
 * Runs before every page (Next.js 16 renamed middleware to proxy). It keeps the
 * Supabase session fresh and sends visitors who are not signed in to /login.
 *
 * This is a convenience, not the security boundary: row level security in the
 * database decides what each user can read or change.
 */
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  const cookiesToSet: Cookie[] = [];
  const headersToSet: Record<string, string> = {};

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies, headers) {
        // The page about to render must see the refreshed session too.
        for (const { name, value } of cookies) {
          request.cookies.set(name, value);
        }
        cookiesToSet.push(...cookies);
        Object.assign(headersToSet, headers);
      },
    },
  });

  // Checks the access token, refreshing it first if it expired (which calls setAll).
  const { data } = await supabase.auth.getClaims();

  const redirectTo = getAuthRedirect(request.nextUrl.pathname, data !== null);
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: request.headers } });

  // The browser must store the refreshed (or cleared) session cookies...
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  // ...and no CDN may cache a response that carries them for other users.
  for (const [key, value] of Object.entries(headersToSet)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Every path except Next.js build files and images, which need no session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
