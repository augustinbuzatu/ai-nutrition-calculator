import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/..." import alias from tsconfig.json, like Next.js does.
  plugins: [tsconfigPaths()],
  test: {
    // Pure functions run in plain Node; React component tests will need "jsdom" later.
    environment: "node",
    // The evals call the real model and run on their own (npm run eval); their
    // grading code is tested here.
    include: [
      "src/**/*.test.{ts,tsx}",
      "supabase/tests/**/*.test.ts",
      "evals/**/*.test.ts",
    ],
  },
});
