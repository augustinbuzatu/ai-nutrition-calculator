import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/..." import alias from tsconfig.json, like Next.js does.
  plugins: [tsconfigPaths()],
  test: {
    // Pure functions run in plain Node; React component tests will need "jsdom" later.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
