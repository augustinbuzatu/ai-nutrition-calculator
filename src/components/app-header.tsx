import { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/user";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          AI Nutrition Calculator
        </Link>
        {/* Reading the session waits on cookies; the rest of the page need not wait for it. */}
        <Suspense>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate text-sm text-muted-foreground">
        {user.email}
      </span>
      {/* A form, not an onClick: it works before JavaScript loads, and needs no client component. */}
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
