import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="font-semibold tracking-tight">
          AI Nutrition Calculator
        </Link>
      </div>
    </header>
  );
}
