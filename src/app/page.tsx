import Link from "next/link";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { LogMealButton } from "@/components/log-meal-button";
import { MealList } from "@/components/meal-list";
import { StatTile } from "@/components/stat-tile";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/diary/dates";
import { getTodaysDiary } from "@/lib/diary/queries";
import { formatNumber } from "@/lib/format";
import { getGoals } from "@/lib/goals/queries";
import { hasGoals } from "@/lib/goals/schema";
import { roundNutrients, sumNutrients } from "@/lib/nutrition/calculate";

export default async function DashboardPage() {
  const goals = await getGoals();
  // New users set their goals first; returning users land here directly.
  if (!hasGoals(goals)) redirect("/goals");

  const diary = await getTodaysDiary();
  // Add up first, round once: rounding each meal first would drift.
  const eaten = roundNutrients(
    sumNutrients(diary.entries.map((entry) => entry.nutrients)),
  );

  return (
    // Bottom padding keeps the last meal clear of the floating "+" button.
    <div className="pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            {formatDay(diary.date)}
          </p>
        </div>
        <Link
          href="/goals"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Target />
          Goals
        </Link>
      </div>

      <div className="mt-4 grid gap-3">
        <StatTile
          label="Calories"
          value={eaten.kcal}
          goal={goals.kcal}
          unit="kcal"
          kind="limit"
        />
        <StatTile
          label="Protein"
          value={eaten.proteinG}
          goal={goals.protein}
          unit="g"
          kind="target"
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Carbs {formatNumber(eaten.carbsG)} g · Fat {formatNumber(eaten.fatG)} g
      </p>

      <section aria-labelledby="meals-heading" className="mt-6 grid gap-3">
        <h2 id="meals-heading" className="font-semibold">
          Meals
        </h2>
        <MealList entries={diary.entries} />
      </section>

      <LogMealButton />
    </div>
  );
}
