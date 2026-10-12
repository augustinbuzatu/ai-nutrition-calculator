/** Pages for visitors who are not signed in; signed-in users have no use for them. */
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Where the proxy should send a request, or null to let it through.
 * Kept free of Next.js and Supabase so the rules can be tested on their own.
 */
export function getAuthRedirect(
  pathname: string,
  isSignedIn: boolean,
): string | null {
  // Exact matches: a prefix check would also make "/login-history" public.
  const isAuthPage = AUTH_PAGES.includes(pathname);
  // The link in the confirmation email lands here before there is a session.
  const isAuthCallback = pathname.startsWith("/auth/");

  if (!isSignedIn && !isAuthPage && !isAuthCallback) return "/login";
  if (isSignedIn && isAuthPage) return "/";
  return null;
}
