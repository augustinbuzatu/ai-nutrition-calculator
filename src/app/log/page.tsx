import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// With the template from the root layout, the tab shows "Log a meal | AI Nutrition Calculator".
export const metadata: Metadata = {
  title: "Log a meal",
};

export default function LogMealPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Log a meal</h1>
      <p className="mt-2 text-muted-foreground">
        Coming soon: describe what you ate, in English or Romanian, and the app
        will work out the calories and macros.
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 self-start",
        )}
      >
        <ArrowLeft />
        Back to today
      </Link>
    </>
  );
}
