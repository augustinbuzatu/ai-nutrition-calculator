import { LogMealButton } from "@/components/log-meal-button";
import { StatTile } from "@/components/stat-tile";

// Placeholder numbers until meals are stored in the database (Etapa 3).
const consumed = { calories: 0, protein: 0 };
const dailyGoal = { calories: 2000, protein: 150 };

export default function DashboardPage() {
  return (
    // Bottom padding keeps the last card clear of the floating "+" button.
    <div className="pb-24">
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      <div className="mt-4 grid gap-3">
        <StatTile
          label="Calories"
          value={consumed.calories}
          goal={dailyGoal.calories}
          unit="kcal"
        />
        <StatTile
          label="Protein"
          value={consumed.protein}
          goal={dailyGoal.protein}
          unit="g"
        />
      </div>
      <LogMealButton />
    </div>
  );
}
