import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditMealForm } from "@/components/edit-meal-form";
import { buttonVariants } from "@/components/ui/button";
import { getMeal } from "@/lib/meals/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Edit meal",
};

export default async function EditMealPage({
  params,
}: PageProps<"/meals/[id]">) {
  const { id } = await params;
  const meal = await getMeal(id);
  // A wrong id, a deleted meal and someone else's meal all look the same.
  if (!meal) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit meal</h1>
      <EditMealForm meal={meal} />
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
