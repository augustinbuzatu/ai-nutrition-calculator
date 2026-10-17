import { TriangleAlert } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { MealCheck } from "@/lib/meals/form";
import { roundNutrients } from "@/lib/nutrition/calculate";
import type { Nutrients } from "@/lib/nutrition/schemas";

type MealPreviewProps = {
  /** null while the fields are incomplete. */
  check: MealCheck | null;
  /** "Adds" for a new meal, "Now" when editing one. */
  verb: string;
  empty: string;
};

/** What the meal amounts to, updated as the user types. */
export function MealPreview({ check, verb, empty }: MealPreviewProps) {
  return (
    // Always rendered, so screen readers announce each change.
    <div aria-live="polite" className="grid gap-2">
      {check === null && (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
      {check && !check.ok && (
        <p className="text-sm text-destructive">{check.error}</p>
      )}
      {check?.ok && (
        <>
          <p className="rounded-lg bg-muted p-4">
            {verb} <Totals nutrients={roundNutrients(check.nutrients)} />
          </p>
          {check.warning && (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {check.warning}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Rounded nutrients, kcal first. */
function Totals({ nutrients }: { nutrients: Nutrients }) {
  // A non-breaking space keeps each number on the same line as its unit.
  const amount = (value: number, unit: string) =>
    `${formatNumber(value)}\u00a0${unit}`;
  return (
    <>
      <strong className="font-semibold">
        {amount(nutrients.kcal, "kcal")}
      </strong>{" "}
      · {amount(nutrients.proteinG, "g")} protein ·{" "}
      {amount(nutrients.carbsG, "g")} carbs · {amount(nutrients.fatG, "g")} fat
    </>
  );
}
