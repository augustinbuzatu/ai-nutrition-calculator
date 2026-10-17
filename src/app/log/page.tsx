import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MealForm } from "@/components/meal-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// With the template from the root layout, the tab shows "Log a meal | AI Nutrition Calculator".
export const metadata: Metadata = {
  title: "Log a meal",
};

export default function LogMealPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log a meal</h1>
        <p className="mt-1 text-muted-foreground">
          Copy the values from the label or the menu. Describing a meal in words
          is coming soon.
        </p>
      </div>
      <MealForm />
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "outline" }), "self-start")}
      >
        <ArrowLeft />
        Back to today
      </Link>
    </div>
  );
}
