/**
 * The Supabase project this app talks to, read from .env.local (see .env.example).
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
      "Missing Supabase settings: copy .env.example to .env.local and fill in your project's URL and publishable key.",
    );
  }
  return { url, publishableKey };
}
