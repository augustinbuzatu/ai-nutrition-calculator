/**
 * The same ranges as the check constraints on public.profiles. A test in
 * supabase/tests runs them against the database, so the two cannot drift apart.
 *
 * In a file of their own so the form can show them without shipping Zod to the browser.
 */
export const GOAL_LIMITS = {
  kcal: { min: 800, max: 10_000 },
  protein: { min: 10, max: 500 },
} as const;
