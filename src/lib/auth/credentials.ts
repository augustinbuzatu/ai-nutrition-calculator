import * as z from "zod";

// trim() before the email check: z.email().trim() would check " me@x.com " first and reject it.
const emailSchema = z
  .string({ error: "Enter your email." })
  .trim()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const signInSchema = z.object({
  email: emailSchema,
  // Any non-empty password: the rules for new passwords may change, old ones must still work.
  password: z
    .string({ error: "Enter your password." })
    .min(1, { error: "Enter your password." }),
});

export const signUpSchema = z.object({
  email: emailSchema,
  // Never trimmed: a space can be part of a password.
  password: z
    .string({ error: "Enter a password." })
    .min(8, { error: "Use at least 8 characters." })
    // Supabase hashes passwords with bcrypt, which reads at most 72 bytes, and
    // rejects longer ones. Bytes, not characters: "ș" takes two in UTF-8.
    .refine((password) => utf8Length(password) <= 72, {
      error: "This password is too long.",
    }),
});

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

export type Credentials = z.infer<typeof signInSchema>;

/** What a sign-in or sign-up form shows after the server answered. */
export type AuthFormState = {
  fieldErrors?: { email?: string[]; password?: string[] };
  /** A problem with the request as a whole, such as a wrong password. */
  error?: string;
  /** Not a problem: for example, "check your email". */
  message?: string;
};

type ParsedCredentials =
  { ok: true; credentials: Credentials } | { ok: false; state: AuthFormState };

/** Reads and validates the form, or returns the errors to show next to each field. */
export function parseCredentials(
  schema: typeof signInSchema | typeof signUpSchema,
  formData: FormData,
): ParsedCredentials {
  const result = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (result.success) return { ok: true, credentials: result.data };
  return {
    ok: false,
    state: { fieldErrors: z.flattenError(result.error).fieldErrors },
  };
}

/**
 * Turns a Supabase Auth error code into a message for the user. Raw messages
 * are never shown: they can be technical or reveal more than they should.
 */
export function describeAuthError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      // Deliberately vague: saying which one was wrong tells an attacker the email exists.
      return "Wrong email or password.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "weak_password":
      return "This password is too easy to guess. Choose a stronger one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
