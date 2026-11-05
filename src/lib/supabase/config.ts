/**
 * The Supabase project this app talks to: .env, committed, holds the shared
 * project; .env.local can override it, for a local Supabase.
 *
 * Both values are public: the publishable key only lets a visitor do what the
 * row level security policies allow. The secret key never belongs here.
 */
export function getSupabaseConfig() {
  // Written out in full, not as process.env[name]: Next.js only inlines
  // NEXT_PUBLIC_ variables it can find literally in the code.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase settings: run start.cmd (or npm run app), or fill in the project's URL and publishable key in .env.",
    );
  }
  return { url, publishableKey };
}
