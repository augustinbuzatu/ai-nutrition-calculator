import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Create an account",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mt-1 text-muted-foreground">
          Describe what you eat; the app counts the calories.
        </p>
      </div>

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        passwordAutoComplete="new-password"
        passwordHint="At least 8 characters."
      />

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
