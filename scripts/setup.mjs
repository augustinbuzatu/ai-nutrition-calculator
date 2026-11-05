// @ts-check
// The checks behind start.cmd, as pure functions so `npm test` covers them.
// Plain JavaScript: Node runs it before any dependency is installed.

/**
 * Whether a Node.js version ("22.11.0") is at least `minMajor`.
 * @param {string} version
 * @param {number} minMajor
 */
export function meetsNode(version, minMajor) {
  const major = Number.parseInt(version.replace(/^v/, ""), 10);
  return Number.isInteger(major) && major >= minMajor;
}

/**
 * The variables in a .env file. Comments and blank lines are skipped, and
 * quotes around a value are removed.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    values.set(match[1], match[2].replace(/^(["'])(.*)\1$/, "$2"));
  }
  return values;
}

/**
 * `text` with `key` set to `value`: the existing line is replaced, so the
 * comments around it stay, or a new line is added at the end.
 * @param {string} text
 * @param {string} key
 * @param {string} value
 */
export function withEnvValue(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
  if (pattern.test(text)) return text.replace(pattern, line);
  const separator = text === "" || text.endsWith("\n") ? "" : "\n";
  return `${text}${separator}${line}\n`;
}

/**
 * What is wrong with the Supabase settings, or null. The app talks to
 * Augustin's project (https://<ref>.supabase.co) or to a local Supabase.
 * @param {{ url?: string, publishableKey?: string }} settings
 * @returns {string | null}
 */
export function supabaseSettingsProblem({ url, publishableKey }) {
  if (!url || !publishableKey) return "missing";
  if (!isSupabaseUrl(url)) {
    return "The project URL looks like https://<project-ref>.supabase.co.";
  }
  if (publishableKey.startsWith("sb_secret_")) {
    return "That is the secret key. It must never be in .env or reach a browser: use the publishable key, which starts with sb_publishable_.";
  }
  if (!publishableKey.startsWith("sb_publishable_")) {
    return "The publishable key starts with sb_publishable_ (Project Settings, API Keys).";
  }
  return null;
}

/** @param {string} url */
function isSupabaseUrl(url) {
  return (
    projectRefFrom(url) !== null ||
    /^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url)
  );
}

/**
 * The project ref in a Supabase URL ("https://abcd….supabase.co" -> "abcd…"),
 * which the Supabase CLI links to; null for any other URL.
 * @param {string} url
 */
export function projectRefFrom(url) {
  return /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(url)?.[1] ?? null;
}

/** Variables the committed .env may hold: public ones only. */
const PUBLIC_VARIABLES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]);

/** What a secret looks like: Supabase secret keys, Anthropic and OpenAI keys. */
const SECRET = /sb_secret_|sk-ant-|sk-(proj-)?[A-Za-z0-9]{20,}/;

/**
 * Why `text`, the committed .env, would leak something, or an empty list.
 * Git keeps every version of a committed file, so a secret there is out for good.
 * @param {string} text
 * @returns {string[]}
 */
export function committedEnvProblems(text) {
  const problems = [];
  for (const [key, value] of parseEnv(text)) {
    if (!PUBLIC_VARIABLES.has(key)) {
      problems.push(`${key} does not belong in .env: put it in .env.local.`);
    }
    if (SECRET.test(value)) {
      problems.push(`${key} holds a secret: it belongs in .env.local.`);
    }
  }
  return problems;
}

/**
 * Whether an AI key is set, from the environment or .env.local. Without one
 * the app still works, with meals added by hand.
 * @param {Map<string, string>} env
 */
export function hasAiKey(env) {
  return Boolean(env.get("APP_ANTHROPIC_API_KEY") || env.get("OPENAI_API_KEY"));
}
