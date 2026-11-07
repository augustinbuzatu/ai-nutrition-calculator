"use client"; // Error boundaries must be Client Components.

import "./globals.css";

/**
 * When the root layout itself fails, this replaces it, with its own <html>:
 * plain markup, and the app's styles so it still fits light and dark mode.
 */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <title>Something went wrong | AI Nutrition Calculator</title>
        <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            The app could not start. Trying again often works; if it does not,
            come back in a few minutes.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
