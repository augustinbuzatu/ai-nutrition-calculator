import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogMealButton() {
  return (
    // Fixed to the bottom of the screen, but aligned with the phone-width column.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-end p-6">
      {/* A link, not a <button>: it navigates to another page. */}
      <Link
        href="/log"
        aria-label="Log a meal"
        className={cn(
          buttonVariants({ size: "icon-lg" }),
          "pointer-events-auto size-14 rounded-full shadow-lg",
        )}
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
