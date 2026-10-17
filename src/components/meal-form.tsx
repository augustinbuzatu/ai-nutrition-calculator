"use client";

import { type ChangeEvent, useActionState, useState } from "react";
import { FormField, describedBy } from "@/components/form-field";
import { MealPreview } from "@/components/meal-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { isKeyOf } from "@/lib/input";
import { addMeal } from "@/lib/meals/actions";
import {
  BASES,
  type MealFields,
  UNIT_LABELS,
  checkMeal,
  parseMeal,
} from "@/lib/meals/form";

const EMPTY: MealFields = {
  name: "",
  basis: "per100g",
  servingLabel: "",
  kcal: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  amount: "",
  unit: "g",
};

const NUTRIENT_FIELDS = [
  { name: "kcal", label: "Calories (kcal)" },
  { name: "proteinG", label: "Protein (g)" },
  { name: "carbsG", label: "Carbs (g)" },
  { name: "fatG", label: "Fat (g)" },
] as const;

export function MealForm() {
  const [state, formAction, pending] = useActionState(addMeal, {});
  // Controlled: the preview needs every keystroke, and an error from the
  // server must not wipe what was typed.
  const [fields, setFields] = useState(EMPTY);
  const errors = state.errors ?? {};

  const parsed = parseMeal(fields);
  const check = parsed.ok ? checkMeal(parsed.meal) : null;
  const basis = isKeyOf(fields.basis, BASES) ? fields.basis : "per100g";

  function update(name: keyof MealFields) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((current) => ({ ...current, [name]: event.target.value }));
  }

  // Each basis has its own units (servings of a food labelled per 100 g
  // would need the serving's weight), so switching resets the unit.
  function changeBasis(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    setFields((current) => ({
      ...current,
      basis: next,
      unit: isKeyOf(next, BASES) ? BASES[next].units[0] : "",
    }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormField id="name" label="What did you eat?" error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="off"
          placeholder="Chicken breast"
          required
          value={fields.name}
          onChange={update("name")}
          {...describedBy("name", errors.name)}
        />
      </FormField>

      <fieldset className="grid gap-4">
        <legend className="mb-4 font-medium">
          Nutrition facts, from the label or the menu
        </legend>
        <FormField id="basis" label="Values are given" error={errors.basis}>
          <NativeSelect
            id="basis"
            name="basis"
            className="w-full"
            value={fields.basis}
            onChange={changeBasis}
            {...describedBy("basis", errors.basis)}
          >
            {Object.entries(BASES).map(([value, { label }]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        {basis === "perServing" && (
          <FormField
            id="servingLabel"
            label="One serving is"
            hint="For example “1 burger” or “1 slice”."
            error={errors.servingLabel}
          >
            <Input
              id="servingLabel"
              name="servingLabel"
              autoComplete="off"
              required
              value={fields.servingLabel}
              onChange={update("servingLabel")}
              {...describedBy(
                "servingLabel",
                errors.servingLabel,
                "For example “1 burger” or “1 slice”.",
              )}
            />
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          {NUTRIENT_FIELDS.map(({ name, label }) => (
            <FormField key={name} id={name} label={label} error={errors[name]}>
              <Input
                id={name}
                name={name}
                inputMode="decimal"
                autoComplete="off"
                required
                value={fields[name]}
                onChange={update(name)}
                {...describedBy(name, errors[name])}
              />
            </FormField>
          ))}
        </div>
      </fieldset>

      <FormField
        id="amount"
        label="How much you ate"
        error={errors.amount ?? errors.unit}
      >
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            required
            value={fields.amount}
            onChange={update("amount")}
            {...describedBy("amount", errors.amount ?? errors.unit)}
          />
          <NativeSelect
            name="unit"
            aria-label="Unit"
            value={fields.unit}
            onChange={update("unit")}
          >
            {BASES[basis].units.map((unit) => (
              <NativeSelectOption key={unit} value={unit}>
                {UNIT_LABELS[unit]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </FormField>

      <MealPreview
        check={check}
        verb="Adds"
        empty="Fill in the values to see what this meal adds."
      />

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* Impossible values cannot be saved: the preview already says why. */}
      <Button
        type="submit"
        size="lg"
        disabled={pending || (check !== null && !check.ok)}
      >
        {pending ? "Saving…" : "Add meal"}
      </Button>
    </form>
  );
}
