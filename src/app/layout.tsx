import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const geistSans = Geist({
  // Must match the variable the shadcn theme reads in globals.css (`font-sans`).
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Nutrition Calculator",
    // Child pages only set their own title: "Settings" -> "Settings | AI Nutrition Calculator".
    template: "%s | AI Nutrition Calculator",
  },
  description:
    "Log meals in plain language and get accurate calories and macros. The AI parses, the code calculates.",
};

// Colors the mobile browser bar to match the page background (see --background in globals.css).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Phone-width column: the app is built for mobile, and wider screens show the same column centered. */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <AppHeader />
          <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
