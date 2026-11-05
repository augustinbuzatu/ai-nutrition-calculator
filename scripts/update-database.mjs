// @ts-check
// For the maintainer: applies new migrations (supabase/migrations) to the
// Supabase project in .env. update-database.cmd runs it on Windows;
// elsewhere, `npm run db:push`. The first time, the Supabase CLI asks you to
// sign in, in the browser, and for the database password.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv, projectRefFrom } from "./setup.mjs";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

try {
  if (!existsSync("node_modules/supabase/dist/supabase.js")) {
    throw new Error("Run start.cmd once first: it installs what this needs.");
  }
  const url = parseEnv(
    existsSync(".env") ? readFileSync(".env", "utf8") : "",
  ).get("NEXT_PUBLIC_SUPABASE_URL");
  const ref = url ? projectRefFrom(url) : null;
  if (!ref) {
    throw new Error(
      "No Supabase project in .env yet: run start.cmd once, or fill in .env.",
    );
  }

  console.log(`Updating the database of the Supabase project ${ref}.\n`);
  // A first link fails without a sign-in: sign in, then link again.
  if (!supabase("link", "--project-ref", ref)) {
    if (!supabase("login") || !supabase("link", "--project-ref", ref)) {
      throw new Error("Could not link the Supabase project: see above.");
    }
  }
  if (!supabase("db", "push")) {
    throw new Error("The migrations were not applied: see above.");
  }

  console.log(`
Done. If this was the first time, check two settings in the Supabase
dashboard, Authentication -> URL Configuration:
  - Site URL: the app's address (http://localhost:3000 until it is online)
  - Redirect URLs: http://localhost:3000/** (and the online address, later)`);
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}

/**
 * Runs the project's Supabase CLI, showing its questions and output.
 * @param {...string} args
 */
function supabase(...args) {
  // The CLI is a Node script in the dependencies: no shell, no global install.
  const result = spawnSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", ...args],
    { stdio: "inherit" },
  );
  return result.status === 0;
}
