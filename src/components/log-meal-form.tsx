"use client";

import { Plus } from "lucide-react";
import { type FormEvent, useActionState, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { FormField, describedBy } from "@/components/form-field";
import { MealCard } from "@/components/meal-card";
import { MealPreview } from "@/components/meal-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addMeals } from "@/lib/meals/actions";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_MEALS_PER_SAVE,
  type MealCheck,
  type MealDraft,
  type MealFields,
  checkMeal,
  parseMeal,
} from "@/lib/meals/form";
import { sumNutrients } from "@/lib/nutrition/calculate";
import { describeMeal } from "@/lib/parser/actions";

/** A card on the page: a draft to save, plus what the parser assumed. */
type Food = MealDraft & {
  key: number;
  note: string | null;
  /** Whether the card shows its errors yet. */
  checked: boolean;
};

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

const DESCRIPTION_HINT =
  "In English or Romanian, with amounts if you know them.";

/**
 * The log page: a description becomes one editable card per food, and cards
 * can also be added by hand. Nothing is saved until the user confirms.
 */
export function LogMealForm({ canDescribe }: { canDescribe: boolean }) {
  // Without the parser, the page opens on an empty card, like a plain form.
  const [foods, setFoods] = useState<Food[]>(() =>
    canDescribe ? [] : [blankFood(0)],
  );
  const [description, setDescription] = useState("");
  const [readError, setReadError] = useState<string>();
  const [status, setStatus] = useState("");
  const [reading, startReading] = useTransition();
  const [state, formAction, saving] = useActionState(addMeals, {});

  const checks = foods.map((food) => {
    const parsed = parseMeal(food.fields);
    return parsed.ok ? checkMeal(parsed.meal) : null;
  });
  const blocked = checks.some((check) => check !== null && !check.ok);
  const total = sumChecks(checks);
  const drafts: MealDraft[] = foods.map(({ fields, description }) => ({
    fields,
    description,
  }));

  function read(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = description;
    startReading(async () => {
      let result;
      try {
        result = await describeMeal(text);
      } catch {
        result = {
          ok: false as const,
          error:
            "Your meal could not be read. Please try again, or add it by hand.",
        };
      }
      if (!result.ok) {
        setReadError(result.error);
        setStatus("");
        return;
      }
      const { meals } = result;
      setReadError(undefined);
      setDescription("");
      setStatus(
        meals.length === 1
          ? "Found 1 food. Check it, then save."
          : `Found ${meals.length} foods. Check them, then save.`,
      );
      setFoods((current) => {
        const first = nextKey(current);
        return [
          ...current,
          ...meals.map((meal, index) => ({
            key: first + index,
            fields: meal.fields,
            note: meal.note,
            description: text.trim(),
            // The user did not type these values, so nothing is half-written:
            // problems show at once.
            checked: true,
          })),
        ];
      });
    });
  }

  function addByHand() {
    const food = blankFood(nextKey(foods));
    flushSync(() => setFoods([...foods, food]));
    document.getElementById(`food-${food.key}-name`)?.focus();
  }

  function change(key: number, changes: Partial<MealFields>) {
    setFoods((current) =>
      current.map((food) =>
        food.key === key
          ? { ...food, fields: { ...food.fields, ...changes } }
          : food,
      ),
    );
  }

  function remove(key: number) {
    flushSync(() =>
      setFoods((current) => current.filter((food) => food.key !== key)),
    );
    // The button that had focus is gone; this one is always there.
    document.getElementById("add-food")?.focus();
  }

  function save(event: FormEvent<HTMLFormElement>) {
    if (checks.every((check) => check !== null)) return;
    // Something is missing: show every card's errors instead of sending.
    event.preventDefault();
    flushSync(() =>
      setFoods((current) =>
        current.map((food) => ({ ...food, checked: true })),
      ),
    );
    event.currentTarget
      .querySelector<HTMLElement>("[aria-invalid=true]")
      ?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      {canDescribe && (
        <form onSubmit={read} className="grid gap-3">
          <FormField
            id="description"
            label="What did you eat?"
            hint={DESCRIPTION_HINT}
            error={readError}
          >
            <Textarea
              id="description"
              rows={3}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="150 g chicken breast and 2 boiled eggs"
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              {...describedBy("description", readError, DESCRIPTION_HINT)}
            />
          </FormField>
          <Button type="submit" size="lg" disabled={reading}>
            {reading ? "Reading…" : "Read meal"}
          </Button>
          <p role="status" className="sr-only">
            {status}
          </p>
        </form>
      )}

      <form
        action={formAction}
        onSubmit={save}
        noValidate
        className="flex flex-col gap-4"
      >
        {foods.some((food) => food.description !== null) && (
          <div>
            <h2 className="font-semibold">Check the values</h2>
            <p className="text-sm text-muted-foreground">
              They are estimates from your description: fix anything that looks
              off.
            </p>
          </div>
        )}

        {foods.map((food, index) => (
          <MealCard
            key={food.key}
            id={`food-${food.key}`}
            title={`Food ${index + 1}`}
            fields={food.fields}
            note={food.note}
            folded={food.description !== null}
            showErrors={food.checked}
            onChange={(changes) => change(food.key, changes)}
            onRemove={() => remove(food.key)}
          />
        ))}

        <Button
          id="add-food"
          type="button"
          variant="outline"
          className="self-start"
          disabled={foods.length >= MAX_MEALS_PER_SAVE}
          onClick={addByHand}
        >
          <Plus aria-hidden />
          {canDescribe ? "Add a food by hand" : "Add another food"}
        </Button>

        {foods.length > 0 && (
          <>
            <input type="hidden" name="meals" value={JSON.stringify(drafts)} />
            {foods.length > 1 && (
              <MealPreview
                check={total}
                verb="Together"
                empty="The total shows once every food is filled in."
              />
            )}
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            {/* Impossible values cannot be saved: their card already says why. */}
            <Button type="submit" size="lg" disabled={saving || blocked}>
              {saving
                ? "Saving…"
                : foods.length === 1
                  ? "Save meal"
                  : `Save ${foods.length} meals`}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

function blankFood(key: number): Food {
  // Errors show only after trying to save, not while the user starts typing.
  return { key, fields: EMPTY, note: null, description: null, checked: false };
}

function nextKey(foods: Food[]): number {
  return Math.max(-1, ...foods.map((food) => food.key)) + 1;
}

/** The foods together, once every one of them can be saved. */
function sumChecks(checks: (MealCheck | null)[]): MealCheck | null {
  const nutrients = [];
  for (const check of checks) {
    if (!check?.ok) return null;
    nutrients.push(check.nutrients);
  }
  return { ok: true, nutrients: sumNutrients(nutrients), warning: null };
}
