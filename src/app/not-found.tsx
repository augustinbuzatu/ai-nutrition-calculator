import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Any address the app has no page for, and a meal that does not exist. */
export default function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        This page does not exist, or it is not yours to see.
      </p>
      <Link href="/" className={buttonVariants({ className: "self-start" })}>
        Back to today
      </Link>
    </div>
  );
}
