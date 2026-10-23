import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { LogMealForm } from "@/components/log-meal-form";
import { buttonVariants } from "@/components/ui/button";
import { isParserConfigured } from "@/lib/parser/parse";
import { cn } from "@/lib/utils";

// With the template from the root layout, the tab shows "Log a meal | AI Nutrition Calculator".
export const metadata: Metadata = {
  title: "Log a meal",
};

export default async function LogMealPage() {
  // Checks for the Anthropic key on each request, not once at build time: CI
  // builds without it.
  await connection();
  const canDescribe = isParserConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log a meal</h1>
        <p className="mt-1 text-muted-foreground">
          {canDescribe
            ? "Describe what you ate, or add a food by hand from its label."
            : "Copy the values from the label or the menu."}
        </p>
      </div>
      <LogMealForm canDescribe={canDescribe} />
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
