// @ts-check
// Checks the tools, installs what is missing and starts the app. start.cmd
// runs it on Windows once Node.js is there; elsewhere, `npm run app`.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  committedEnvProblems,
  hasAiKey,
  meetsNode,
  parseEnv,
  supabaseSettingsProblem,
  withEnvValue,
} from "./setup.mjs";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

// The port the Supabase project's redirect URLs allow for local copies.
const PORT = 3000;
const APP_URL = `http://localhost:${PORT}`;
const INSTALL_STAMP = "node_modules/.installed-from-lock";

/** One terminal interface for every question. */
/** @type {import("node:readline/promises").Interface | undefined} */
let questions;
/** Its lines, buffered: piped answers arrive before the questions are asked. */
/** @type {AsyncIterator<string> | undefined} */
let answers;
/** While true, what is typed is not shown: for the API key. */
let muted = false;

try {
  checkNode();
  await checkPortIsFree();
  installDependencies();
  await checkSupabaseSettings();
  await checkAiKey();
  questions?.close();
  startApp();
} catch (error) {
  questions?.close();
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}

function checkNode() {
  const min = Number.parseInt(readFileSync(".nvmrc", "utf8"), 10);
  if (!meetsNode(process.versions.node, min)) {
    throw new Error(
      `This app needs Node.js ${min} or newer, and this is ${process.versions.node}. Install the LTS version from https://nodejs.org, then try again.`,
    );
  }
  done("Node.js", process.versions.node);
}

async function checkPortIsFree() {
  const busy = await new Promise((resolve) => {
    const socket = connect(PORT, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
  if (busy) {
    throw new Error(
      `Something already uses port ${PORT}. If it is this app, it is already open at ${APP_URL}; otherwise close it and try again.`,
    );
  }
}

/** `npm ci` the first time, and again whenever package-lock.json changes. */
function installDependencies() {
  const lock = createHash("sha256")
    .update(readFileSync("package-lock.json"))
    .digest("hex");
  if (
    existsSync(INSTALL_STAMP) &&
    readFileSync(INSTALL_STAMP, "utf8") === lock
  ) {
    done("Dependencies", "up to date");
    return;
  }
  console.log(
    "\nInstalling the dependencies. The first time takes a few minutes.\n",
  );
  // npm is a .cmd file on Windows, which only a shell can run.
  const result = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error("npm ci failed: the messages above say why.");
  }
  writeFileSync(INSTALL_STAMP, lock);
  done("Dependencies", "installed");
}

async function checkSupabaseSettings() {
  const committed = readEnv(".env");
  const local = readEnv(".env.local");
  /** @param {string} key */
  const setting = (key) =>
    process.env[key] || local.get(key) || committed.get(key);
  const url = setting("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = setting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const problem = supabaseSettingsProblem({ url, publishableKey });
  if (problem === null) {
    done("Supabase", new URL(/** @type {string} */ (url)).host);
    return;
  }
  if (problem !== "missing") {
    throw new Error(`The Supabase settings in .env or .env.local: ${problem}`);
  }

  // Only the first time, on the maintainer's computer: .env is committed, so
  // once it holds the project, nobody else is asked.
  console.log(
    "\nThe Supabase project is not set yet. Both values are public, and are in the\nSupabase dashboard: Project Settings -> API Keys (or the Connect button).\n",
  );
  const newUrl = await ask("Project URL (https://....supabase.co): ");
  const newKey = await ask("Publishable key (sb_publishable_...): ");
  const newProblem = supabaseSettingsProblem({
    url: newUrl,
    publishableKey: newKey,
  });
  if (newProblem !== null) throw new Error(newProblem);

  let text = readText(".env");
  text = withEnvValue(text, "NEXT_PUBLIC_SUPABASE_URL", newUrl);
  text = withEnvValue(text, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", newKey);
  // The same check as the test in CI, before anything is written.
  const leaks = committedEnvProblems(text);
  if (leaks.length > 0) throw new Error(leaks.join("\n"));
  writeFileSync(".env", text);
  done("Supabase", `${new URL(newUrl).host}, saved in .env`);
  console.log(
    "   Commit .env and push it, so nobody else has to do this step.",
  );
}

async function checkAiKey() {
  const local = readEnv(".env.local");
  const env = new Map(local);
  for (const key of ["APP_ANTHROPIC_API_KEY", "OPENAI_API_KEY"]) {
    if (process.env[key])
      env.set(key, /** @type {string} */ (process.env[key]));
  }
  if (hasAiKey(env)) {
    done("AI key", "found");
    return;
  }
  if (local.has("APP_ANTHROPIC_API_KEY")) {
    // Skipped before: no need to ask every time.
    done("AI key", "none, so meals are added by hand (see .env.local)");
    return;
  }

  console.log(
    "\nTo describe meals in words, the app needs an Anthropic API key\n(console.anthropic.com -> API Keys). It stays in .env.local, on this computer only.\n",
  );
  const key = await ask("Paste it, or press Enter to skip: ", { secret: true });
  const template = existsSync(".env.local")
    ? readText(".env.local")
    : readText(".env.example");
  writeFileSync(
    ".env.local",
    withEnvValue(template, "APP_ANTHROPIC_API_KEY", key),
  );
  if (key === "") {
    done(
      "AI key",
      "skipped: meals are added by hand until one is in .env.local",
    );
  } else if (!key.startsWith("sk-ant-")) {
    done(
      "AI key",
      "saved, but Anthropic keys start with sk-ant-: check .env.local",
    );
  } else {
    done("AI key", "saved in .env.local");
  }
}

function startApp() {
  console.log(
    `\nStarting the app at ${APP_URL}. Press Ctrl+C here to stop it.\n`,
  );
  // Node runs Next directly: no shell, so it works the same on every system.
  const next = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--port", String(PORT)],
    { stdio: "inherit" },
  );
  // Ctrl+C reaches both; a stop sent to this script alone reaches Next too.
  for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) {
    process.on(signal, () => next.kill(signal));
  }
  next.on("exit", (code) => process.exit(code ?? 0));
  if (!process.argv.includes("--no-open")) openWhenReady();
}

/** Opens the app in the browser once the server answers. */
async function openWhenReady() {
  for (let second = 0; second < 120; second++) {
    try {
      await fetch(`${APP_URL}/login`);
      openBrowser();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function openBrowser() {
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", APP_URL]]
      : process.platform === "darwin"
        ? ["open", [APP_URL]]
        : ["xdg-open", [APP_URL]];
  const opener = spawn(command, args, { stdio: "ignore", detached: true });
  // No browser to open (a server, a container): the address above is enough.
  opener.on("error", () => {});
  opener.unref();
}

/** @param {string} label @param {string} detail */
function done(label, detail) {
  console.log(`OK  ${label}: ${detail}`);
}

/** @param {string} path */
function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** @param {string} path */
function readEnv(path) {
  return parseEnv(readText(path));
}

/**
 * Asks a question in the terminal. A secret is not shown as it is typed.
 * @param {string} question
 * @param {{ secret?: boolean }} [options]
 */
async function ask(question, { secret = false } = {}) {
  questions ??= createInterface({
    input: stdin,
    output: new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) stdout.write(chunk);
        callback();
      },
    }),
    terminal: stdin.isTTY,
  });
  answers ??= questions[Symbol.asyncIterator]();
  stdout.write(question);
  muted = secret;
  try {
    const { value, done } = await answers.next();
    return done ? "" : String(value).trim();
  } finally {
    // The Enter key was not shown while muted, nor typed at all when piped.
    if (muted || !stdin.isTTY) stdout.write("\n");
    muted = false;
  }
}
