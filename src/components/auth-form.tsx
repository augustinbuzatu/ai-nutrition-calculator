"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "@/lib/auth/credentials";

type AuthFormProps = {
  /** A Server Action: signIn or signUp. */
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  /** Lets password managers tell signing in from creating an account. */
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
};

export function AuthForm({
  action,
  submitLabel,
  passwordAutoComplete,
  passwordHint,
}: AuthFormProps) {
  // state: what the action returned last time; pending: true while it runs.
  const [state, formAction, pending] = useActionState(action, {});
  // Controlled, unlike the password: React clears a form after each submit,
  // and retyping the email after a wrong password would be annoying.
  const [email, setEmail] = useState("");

  if (state.message) {
    return (
      <p role="status" className="rounded-lg bg-muted p-4 text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={
            state.fieldErrors?.email ? "email-error" : undefined
          }
        />
        <FieldError id="email-error" errors={state.fieldErrors?.email} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state.fieldErrors?.password
              ? "password-error"
              : passwordHint && "password-hint"
          }
        />
        {state.fieldErrors?.password ? (
          <FieldError id="password-error" errors={state.fieldErrors.password} />
        ) : (
          passwordHint && (
            <p id="password-hint" className="text-sm text-muted-foreground">
              {passwordHint}
            </p>
          )
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {errors.join(" ")}
    </p>
  );
}
