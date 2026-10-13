"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/format";
import { saveGoals } from "@/lib/goals/actions";
import { GOAL_LIMITS } from "@/lib/goals/limits";
import type { SavedGoals } from "@/lib/goals/schema";
import { cn } from "@/lib/utils";

type GoalsFormProps = {
  /** Fills the fields when the user edits goals they already set. */
  initialGoals: SavedGoals;
  submitLabel: string;
};

export function GoalsForm({ initialGoals, submitLabel }: GoalsFormProps) {
  const [state, formAction, pending] = useActionState(saveGoals, {});
  // Controlled: React clears a form after each submit, and the user should
  // see what they typed next to the error, not the old values.
  const [kcal, setKcal] = useState(initialGoals.kcal?.toString() ?? "");
  const [protein, setProtein] = useState(
    initialGoals.protein?.toString() ?? "",
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <GoalField
        name="kcal"
        label="Calories"
        unit="kcal"
        value={kcal}
        onChange={setKcal}
        errors={state.fieldErrors?.kcal}
        {...GOAL_LIMITS.kcal}
      />
      <GoalField
        name="protein"
        label="Protein"
        unit="g"
        value={protein}
        onChange={setProtein}
        errors={state.fieldErrors?.protein}
        {...GOAL_LIMITS.protein}
      />

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

type GoalFieldProps = {
  name: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  min: number;
  max: number;
};

function GoalField({
  name,
  label,
  unit,
  value,
  onChange,
  errors,
  min,
  max,
}: GoalFieldProps) {
  const messageId = `${name}-message`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        {/* type="text" with a numeric keyboard: type="number" changes the value
            when you scroll over it and accepts input like "1e3". */}
        <Input
          id={name}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={errors ? true : undefined}
          aria-describedby={messageId}
          className="pr-12"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {unit}
        </span>
      </div>
      <p
        id={messageId}
        className={cn(
          "text-sm",
          errors ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {errors
          ? errors.join(" ")
          : `Per day, between ${formatNumber(min)} and ${formatNumber(max)}.`}
      </p>
    </div>
  );
}
