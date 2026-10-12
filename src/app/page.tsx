import Link from "next/link";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { LogMealButton } from "@/components/log-meal-button";
import { StatTile } from "@/components/stat-tile";
import { buttonVariants } from "@/components/ui/button";
import { getGoals } from "@/lib/goals/queries";
import { hasGoals } from "@/lib/goals/schema";

// Placeholder until meals are stored in the database.
const consumed = { calories: 0, protein: 0 };

export default async function DashboardPage() {
  const goals = await getGoals();
  // New users set their goals first; returning users land here directly.
  if (!hasGoals(goals)) redirect("/goals");

  return (
    // Bottom padding keeps the last card clear of the floating "+" button.
    <div className="pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
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
          value={consumed.calories}
          goal={goals.kcal}
          unit="kcal"
        />
        <StatTile
          label="Protein"
          value={consumed.protein}
          goal={goals.protein}
          unit="g"
        />
      </div>
      <LogMealButton />
    </div>
  );
}
