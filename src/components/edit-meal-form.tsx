"use client";

import { type MouseEvent, useActionState, useState } from "react";
import { FormField, describedBy } from "@/components/form-field";
import { MealPreview } from "@/components/meal-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiaryEntry } from "@/lib/diary/queries";
import { deleteMeal, updateMeal } from "@/lib/meals/actions";
import { UNIT_LABELS, parseMealEdit, rescaleNutrients } from "@/lib/meals/form";

export function EditMealForm({ meal }: { meal: DiaryEntry }) {
  // bind() passes the meal's id along with the form's fields.
  const [state, formAction, pending] = useActionState(
    updateMeal.bind(null, meal.id),
    {},
  );
  const [name, setName] = useState(meal.name);
  const [amount, setAmount] = useState(String(meal.quantity));
  const errors = state.errors ?? {};

  const parsed = parseMealEdit({ name, amount });
  const check = parsed.ok
    ? {
        ok: true as const,
        nutrients: rescaleNutrients(
          meal.nutrients,
          meal.quantity,
          parsed.amount,
        ),
        warning: null,
      }
    : null;

  function confirmDelete(event: MouseEvent) {
    // Prevents the submit, so the form never reaches the server.
    if (!window.confirm(`Delete “${meal.name}”?`)) event.preventDefault();
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-6">
        <FormField id="name" label="What you ate" error={errors.name}>
          <Input
            id="name"
            name="name"
            autoComplete="off"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            {...describedBy("name", errors.name)}
          />
        </FormField>

        <FormField
          id="amount"
          label={`How much you ate (${UNIT_LABELS[meal.unit]})`}
          error={errors.amount}
        >
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            {...describedBy("amount", errors.amount)}
          />
        </FormField>

        <MealPreview
          check={check}
          verb="Now"
          empty="Enter a name and an amount to see the new totals."
        />

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      {/* A separate form: deleting must not send (or need) valid fields. */}
      <form action={deleteMeal.bind(null, meal.id)}>
        <Button
          type="submit"
          variant="destructive"
          className="w-full"
          onClick={confirmDelete}
        >
          Delete meal
        </Button>
      </form>
    </div>
  );
}
