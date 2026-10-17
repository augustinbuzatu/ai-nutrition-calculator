import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DiaryEntry } from "@/lib/diary/queries";
import { formatNumber, formatQuantity } from "@/lib/format";
import { roundNutrients } from "@/lib/nutrition/calculate";

export function MealList({ entries }: { entries: DiaryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing logged yet today. Tap + to add a meal.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
      {entries.map((entry) => {
        // Each meal is rounded on its own for display, so the rows may not add
        // up to the totals exactly: those are summed first, then rounded.
        const nutrients = roundNutrients(entry.nutrients);
        return (
          <li key={entry.id}>
            {/* The whole row opens the meal, to edit or delete it. */}
            <Link
              href={`/meals/${entry.id}`}
              className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{entry.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatQuantity(entry.quantity, entry.unit)} ·{" "}
                  {formatNumber(nutrients.proteinG)} g protein
                </p>
              </div>
              <p className="shrink-0 tabular-nums">
                {formatNumber(nutrients.kcal)} kcal
              </p>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
