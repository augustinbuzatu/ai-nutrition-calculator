import { existsSync } from "node:fs";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// The evals call the real model, so they run only on request (npm run eval),
// never in CI. They read the API key from .env.local, like `next dev`;
// variables already set in the shell win.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    testTimeout: 60_000,
    // A few calls at a time stays within a new account's rate limits.
    maxConcurrency: 5,
    // Under a coding agent, Vitest's default reporter hides the logs of
    // passing tests, and with them the report when every case passes.
    reporters: ["default"],
  },
});
