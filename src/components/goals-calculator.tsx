"use client";

import { type ChangeEvent, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import { FormField, describedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatNumber } from "@/lib/format";
import {
  ACTIVITY_LEVELS,
  type BodyStatsFields,
  estimateGoals,
  parseBodyStats,
  SEXES,
  WEIGHT_GOALS,
} from "@/lib/goals/estimate";
import { cn } from "@/lib/utils";

const EMPTY_FIELDS: BodyStatsFields = {
  sex: "",
  age: "",
  heightCm: "",
  weightKg: "",
  activity: "",
  goal: "maintain",
};

type GoalsCalculatorProps = {
  onUse: (goals: { kcal: number; protein: number }) => void;
};

/**
 * Estimates the daily goals from body stats, entirely in the browser.
 * Nothing is sent or saved: body stats are health data, and the app only
 * needs the two goals.
 */
export function GoalsCalculator({ onUse }: GoalsCalculatorProps) {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  // Recomputed on every keystroke; pure functions, so cheap and predictable.
  const parsed = parseBodyStats(fields);
  const estimate = parsed.ok ? estimateGoals(parsed.stats) : null;
  const problem = parsed.ok ? null : parsed.problem;

  function update(name: keyof BodyStatsFields) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((current) => ({ ...current, [name]: event.target.value }));
  }

  return (
    // <details> opens and closes without any JavaScript, and screen readers
    // already know how to announce it.
    <details className="group rounded-xl ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Calculator className="size-5 shrink-0 text-muted-foreground" />
        <span className="grid flex-1 gap-0.5">
          <span className="font-medium">Not sure what to aim for?</span>
          <span className="text-sm text-muted-foreground">
            Estimate your goals from your body and activity.
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="grid gap-4 border-t p-4">
        <FormField
          id="calc-sex"
          label="Sex"
          hint="The equation differs for men and women."
        >
          <NativeSelect
            className="w-full"
            id="calc-sex"
            value={fields.sex}
            onChange={update("sex")}
            {...describedBy(
              "calc-sex",
              undefined,
              "The equation differs for men and women.",
            )}
          >
            <NativeSelectOption value="" disabled>
              Choose…
            </NativeSelectOption>
            {Object.entries(SEXES).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        {/* Units in the labels: three columns leave no room inside the fields. */}
        <div className="grid grid-cols-3 gap-3">
          <FormField id="calc-age" label="Age">
            <Input
              id="calc-age"
              inputMode="numeric"
              autoComplete="off"
              value={fields.age}
              onChange={update("age")}
            />
          </FormField>
          <FormField id="calc-height" label="Height (cm)">
            <Input
              id="calc-height"
              inputMode="numeric"
              autoComplete="off"
              value={fields.heightCm}
              onChange={update("heightCm")}
            />
          </FormField>
          <FormField id="calc-weight" label="Weight (kg)">
            <Input
              id="calc-weight"
              inputMode="decimal"
              autoComplete="off"
              value={fields.weightKg}
              onChange={update("weightKg")}
            />
          </FormField>
        </div>

        <FormField id="calc-activity" label="Activity">
          <NativeSelect
            className="w-full"
            id="calc-activity"
            value={fields.activity}
            onChange={update("activity")}
          >
            <NativeSelectOption value="" disabled>
              Choose…
            </NativeSelectOption>
            {Object.entries(ACTIVITY_LEVELS).map(([value, { label }]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField id="calc-goal" label="Goal">
          <NativeSelect
            className="w-full"
            id="calc-goal"
            value={fields.goal}
            onChange={update("goal")}
          >
            {Object.entries(WEIGHT_GOALS).map(([value, { label }]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        {/* Always rendered, so screen readers announce each new estimate. */}
        <div aria-live="polite">
          {estimate ? (
            <div className="grid gap-3 rounded-lg bg-muted p-4">
              <p>
                About{" "}
                <strong className="font-semibold">
                  {formatNumber(estimate.kcal)} kcal
                </strong>{" "}
                and{" "}
                <strong className="font-semibold">
                  {formatNumber(estimate.protein)} g
                </strong>{" "}
                of protein a day.
              </p>
              <p className="text-sm text-muted-foreground">
                You burn about {formatNumber(estimate.maintenanceKcal)} kcal a
                day. An estimate for healthy adults (Mifflin-St Jeor equation),
                not medical advice.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => onUse(estimate)}
              >
                Use these goals
              </Button>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm",
                problem ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {problem ?? "Fill in every field to see your estimate."}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Nothing you enter here is saved or sent anywhere.
        </p>
      </div>
    </details>
  );
}
