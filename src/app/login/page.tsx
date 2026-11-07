import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { signIn, signInAsDemo } from "@/lib/auth/actions";
import { isDemoConfigured } from "@/lib/auth/demo";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Set by /auth/confirm when the link in the email could not sign the user in.
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back. Your meals are waiting.
        </p>
      </div>

      {error === "demo" && (
        <p role="alert" className="rounded-lg bg-muted p-4 text-sm">
          The demo is not available right now. Please try again later.
        </p>
      )}

      {error === "link" && (
        <p role="alert" className="rounded-lg bg-muted p-4 text-sm">
          That link did not sign you in: it may have expired, or been opened in
          another browser. If you already confirmed your email, sign in below.
        </p>
      )}

      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        passwordAutoComplete="current-password"
      />

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>

      {isDemoConfigured() && (
        <form
          action={signInAsDemo}
          className="flex flex-col gap-2 border-t pt-6"
        >
          <p className="text-sm text-muted-foreground">
            Just looking? The demo is a shared account: other visitors see what
            you log there.
          </p>
          <Button type="submit" variant="outline" className="self-start">
            Try the demo
          </Button>
        </form>
      )}
    </div>
  );
}
