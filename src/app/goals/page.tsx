import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalsForm } from "@/components/goals-form";
import { buttonVariants } from "@/components/ui/button";
import { getGoals } from "@/lib/goals/queries";
import { hasGoals } from "@/lib/goals/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daily goals",
};

// Onboarding for new users (the dashboard sends them here until both goals
// are set), and the place to change the goals later.
export default async function GoalsPage() {
  const goals = await getGoals();
  const isOnboarding = !hasGoals(goals);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isOnboarding ? "Set your daily goals" : "Daily goals"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isOnboarding
            ? "Welcome! Two numbers and you're ready to log meals. You can change them any time."
            : "Change them whenever your plans change."}
        </p>
      </div>

      <GoalsForm
        initialGoals={goals}
        submitLabel={isOnboarding ? "Start tracking" : "Save goals"}
      />

      {!isOnboarding && (
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "self-start")}
        >
          <ArrowLeft />
          Back to today
        </Link>
      )}
    </div>
  );
}
