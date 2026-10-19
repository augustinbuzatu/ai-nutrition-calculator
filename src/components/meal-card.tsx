"use client";

import { Info, X } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { flushSync } from "react-dom";
import { FormField, describedBy } from "@/components/form-field";
import { MealPreview } from "@/components/meal-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatNutrient } from "@/lib/format";
import { isKeyOf, parseNumberInput } from "@/lib/input";
import {
  BASES,
  type MealFields,
  UNIT_LABELS,
  checkMeal,
  parseMeal,
} from "@/lib/meals/form";

const NUTRIENT_FIELDS = [
  { name: "kcal", label: "Calories (kcal)", unit: "kcal", short: undefined },
  { name: "proteinG", label: "Protein (g)", unit: "g", short: "protein" },
  { name: "carbsG", label: "Carbs (g)", unit: "g", short: "carbs" },
  { name: "fatG", label: "Fat (g)", unit: "g", short: "fat" },
] as const;

/** The fields that describe the food itself, not how much of it was eaten. */
const FACT_FIELDS = [
  "basis",
  "servingLabel",
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
] as const;

type MealCardProps = {
  /** Prefix for the ids of the card's fields, unique on the page. */
  id: string;
  title: string;
  fields: MealFields;
  /** What the parser assumed, when it filled in the card. */
  note: string | null;
  /** Cards the parser filled in start with the nutrition facts folded. */
  folded: boolean;
  showErrors: boolean;
  onChange: (changes: Partial<MealFields>) => void;
  onRemove: () => void;
};

/** One food on the log page, with its own live preview. */
export function MealCard({
  id,
  title,
  fields,
  note,
  folded,
  showErrors,
  onChange,
  onRemove,
}: MealCardProps) {
  const [editing, setEditing] = useState(!folded);
  const parsed = parseMeal(fields);
  const check = parsed.ok ? checkMeal(parsed.meal) : null;
  const errors = showErrors && !parsed.ok ? parsed.errors : {};
  const basis = isKeyOf(fields.basis, BASES) ? fields.basis : "per100g";
  const fieldId = (name: keyof MealFields) => `${id}-${name}`;
  // Folded facts open by themselves when there is something to fix in them.
  const factsOpen =
    editing ||
    FACT_FIELDS.some((name) => errors[name]) ||
    (check !== null && !check.ok);

  function update(name: keyof MealFields) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ [name]: event.target.value });
  }

  // Each basis has its own units (servings of a food labelled per 100 g
  // would need the serving's weight), so switching resets the unit.
  function changeBasis(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    onChange({
      basis: next,
      unit: isKeyOf(next, BASES) ? BASES[next].units[0] : "",
    });
  }

  function editFacts() {
    // Renders the fields right away, so focus can move into them.
    flushSync(() => setEditing(true));
    document.getElementById(fieldId("basis"))?.focus();
  }

  return (
    <Card>
      <section aria-labelledby={`${id}-title`} className="grid gap-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id={`${id}-title`} className="font-medium">
            {title}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove ${title.toLowerCase()}`}
            onClick={onRemove}
          >
            <X aria-hidden />
            Remove
          </Button>
        </div>

        {note && (
          <p className="flex gap-2 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {note}
          </p>
        )}

        <FormField id={fieldId("name")} label="Name" error={errors.name}>
          <Input
            id={fieldId("name")}
            autoComplete="off"
            value={fields.name}
            onChange={update("name")}
            {...describedBy(fieldId("name"), errors.name)}
          />
        </FormField>

        {factsOpen ? (
          <fieldset className="grid gap-4">
            <legend className="mb-4 font-medium">Nutrition facts</legend>
            <FormField
              id={fieldId("basis")}
              label="Values are given"
              error={errors.basis}
            >
              <NativeSelect
                id={fieldId("basis")}
                className="w-full"
                value={fields.basis}
                onChange={changeBasis}
                {...describedBy(fieldId("basis"), errors.basis)}
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
                id={fieldId("servingLabel")}
                label="One serving is"
                hint="For example “1 burger” or “1 slice”."
                error={errors.servingLabel}
              >
                <Input
                  id={fieldId("servingLabel")}
                  autoComplete="off"
                  value={fields.servingLabel}
                  onChange={update("servingLabel")}
                  {...describedBy(
                    fieldId("servingLabel"),
                    errors.servingLabel,
                    "For example “1 burger” or “1 slice”.",
                  )}
                />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-3">
              {NUTRIENT_FIELDS.map(({ name, label }) => (
                <FormField
                  key={name}
                  id={fieldId(name)}
                  label={label}
                  error={errors[name]}
                >
                  <Input
                    id={fieldId(name)}
                    inputMode="decimal"
                    autoComplete="off"
                    value={fields[name]}
                    onChange={update(name)}
                    {...describedBy(fieldId(name), errors[name])}
                  />
                </FormField>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p>
              <span className="block text-muted-foreground">
                {basis === "perServing"
                  ? `Per serving (${fields.servingLabel})`
                  : BASES[basis].label}
              </span>
              {NUTRIENT_FIELDS.map(({ name, unit, short }) => {
                // Folded facts came from the parser as plain numbers.
                const value = parseNumberInput(fields[name], "decimal");
                return typeof value === "number"
                  ? formatNutrient(value, unit, short)
                  : fields[name];
              }).join(" · ")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Edit the nutrition facts of ${title.toLowerCase()}`}
              aria-expanded={false}
              onClick={editFacts}
            >
              Edit
            </Button>
          </div>
        )}

        <FormField
          id={fieldId("amount")}
          label="How much you ate"
          error={errors.amount ?? errors.unit}
        >
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              id={fieldId("amount")}
              inputMode="decimal"
              autoComplete="off"
              value={fields.amount}
              onChange={update("amount")}
              {...describedBy(fieldId("amount"), errors.amount ?? errors.unit)}
            />
            <NativeSelect
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
          empty="Fill in the values to see what this food adds."
        />
      </section>
    </Card>
  );
}
