"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  type AuthFormState,
  describeAuthError,
  parseCredentials,
  signInSchema,
  signUpSchema,
} from "./credentials";

// Server Actions are public HTTP endpoints: anyone can call them with any
// data, so each one validates its input on the server, whatever the form checked.

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseCredentials(signInSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.credentials);
  if (error) return { error: describeAuthError(error.code) };

  // Render the layout again, so the header shows who is signed in.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseCredentials(signUpSchema, formData);
  if (!parsed.ok) return parsed.state;

  // The link in the confirmation email leads back to this app. Supabase only
  // follows it if the URL is on the project's Redirect URLs allow list.
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.credentials,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  });
  if (error) return { error: describeAuthError(error.code) };

  // With "Confirm email" on (the Supabase default) there is no session until
  // the user opens the link in the email.
  if (!data.session) {
    return {
      message: `Check ${parsed.credentials.email} for a link to finish signing up.`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  // "local" signs out this browser only; the default would end every session, on every device.
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}
