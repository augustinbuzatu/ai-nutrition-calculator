@AGENTS.md

# AI Nutrition Calculator

Augustin's personal and portfolio project (Cybernetics student, ASE Bucharest; works on Windows). A mobile-first web app: describe meals in plain language, in English or Romanian, and get calories and macros. The LLM will only turn text into structured data; all math is deterministic, unit-tested TypeScript.

## Working together

- Talk to Augustin in Romanian. Code, comments, commits, PRs and the README are in English. The UI is in English; the meal input will also accept Romanian.
- Act as a senior full-stack developer and mentor: write the code step by step and explain the decisions. Mark notes with 🎯 (worth remembering), ⚠️ (pitfall) and 💼 (interview angle).
- Propose major changes before making them. "Treci la următorul PR/merge" means: implement the next roadmap task and open a PR. The PR is the approval gate.
- One PR per task, from the branch the session assigns, into `main`. Augustin merges, preferably with "Rebase and merge". Reset the branch onto `origin/main` before each new task.
- Commits: Conventional Commits, small and topical, with `Augustin <augustinbuzatu@gmail.com>` as the only author and no trailers. PR descriptions end after the testing section, with no footer.
- Never schedule check-ins (`send_later`, triggers) or subscribe to PR activity: they cost money. Augustin says when he has merged.
- Never ask for keys, tokens or passwords in the chat. The `sb_secret_` key, `OPENAI_API_KEY` and `APP_ANTHROPIC_API_KEY` never go into code, `NEXT_PUBLIC_` variables, the chat or GitHub. `.env.local` is gitignored. `.env` is committed and holds only the shared Supabase project's public URL and publishable key (project `ngwijmxzhulvcijtoyzx`): both are public by design, unlike every other key.

## Stack

Next.js 16 (App Router, Server Components, Server Actions, React Compiler) · React 19 · TypeScript (strict) · Tailwind CSS v4 (configured in CSS) · shadcn/ui (base-nova, Base UI primitives) · Zod 4 · Supabase (Postgres with RLS, Auth with email and password, `@supabase/ssr`) · Vercel AI SDK 7 + OpenAI (`gpt-6-luna`), or Anthropic (`claude-haiku-5-5`) until the OpenAI key is in place · Vitest · PGlite · ESLint 9 · Prettier · GitHub Actions.

## Commands

`node scripts/make-icons.mjs` redraws the app icons (`public/`, `src/app/icon.png`, `apple-icon.png`) · `start.cmd` (Windows, double-click) or `npm run app`: checks Node.js, installs what is missing, asks once for the AI key, starts the app · `update-database.cmd` or `npm run db:push`: applies new migrations to the shared project · `npm ci` · `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` (runs `next typegen` first) · `npm test` · `npm run format` / `format:check` · `npm run db:types` (regenerates `src/lib/supabase/database.types.ts` from the linked project) · `npm run eval` (grades the parser against the real model; needs `OPENAI_API_KEY` or `APP_ANTHROPIC_API_KEY`).

CI runs `format:check`, `lint`, `typecheck`, `test` and `build`. Run all five before pushing; `build` must pass without `.env.local`.

## Where things are

- `start.cmd` → `scripts/run.ps1` (Node.js via winget, for Windows PowerShell 5.1) → `scripts/start.mjs` (port, `npm ci` when the lockfile changed, Supabase settings, AI key, `next dev`, browser). `update-database.cmd` → `scripts/update-database.mjs`. Their pure checks are in `scripts/setup.mjs`, tested in `npm test`, including a test that keeps secrets out of `.env`.
- `.env`: committed, the shared Supabase project's public settings. `.env.local` (gitignored, from `.env.example`): the AI keys, and overrides such as a local Supabase.
- `src/proxy.ts`: Next 16's name for middleware. Refreshes the Supabase session and sends signed-out visitors to `/login` (rules in `src/lib/auth/routes.ts`).
- `src/lib/supabase/`: `createClient()` for the server, env config, generated database types.
- `src/lib/auth/`: Server Actions (sign in, sign up, sign out), credential validation and error messages, `getCurrentUser()` / `requireUser()`.
- `src/lib/profile.ts`: `getProfile()` (goals and time zone), cached per request.
- `src/lib/goals/`: limits (mirror the DB constraints), Zod schema, `getGoals()`, `saveGoals()`, and `estimate.ts` (Mifflin-St Jeor calculator, browser only).
- `src/lib/diary/`: `todayIn()` (today's date in the user's time zone), progress status for the stat tiles, `getTodaysDiary()`.
- `src/lib/meals/`: the meal form's rules (`form.ts`, shared by the browser preview and the server), `submission.ts` (reads the log page's cards on the server, with Zod), `getMeal()`, and the `addMeals` / `updateMeal` / `deleteMeal` Server Actions.
- `src/lib/parser/`: `parseMealDescription()` turns a description into the meal form's fields, one set per food, with OpenAI or Claude, and the restaurant or shop each comes from (`place`, described on the schema field); the model's instructions are in `instructions.ts`, the choice of provider and model in `model.ts` (OpenAI wins when both keys are set). `describeMeal` is its Server Action, and `isParserConfigured()` checks for a key.
- `evals/`: the parser's eval set (`cases.ts`, with USDA-based ranges), the grader (`grade.ts`, unit-tested in `npm test`) and the runner (`parser.eval.ts`, its own Vitest config).
- `src/components/log-meal-form.tsx` and `meal-card.tsx`: the log page, where a description becomes one editable card per food.
- `src/lib/foods/`: step 2 of reading a meal. `queries.ts` searches the cache (`search_foods`) and saves to it; `cache.ts` decides, purely, which match is the same food (`SAME_FOOD_SIMILARITY`, same numbers) and applies its values, working out one piece from values per 100 g; `agent.ts` is the web-search agent (Claude Haiku with Anthropic's `web_search` and `web_fetch`); `published.ts` checks its answer in code; `places.ts` maps chains to official sites. `resolveMeals()` runs cache, then agent for foods with a place, for `describeMeal`, keeping estimates when a step fails.
- `src/lib/ai/`: who may use the AI. `access.ts` asks the database (`getAiAllowance()`, `takeAiUse()`); `limits.ts` maps its answers to results and messages. The rules live in the `ai_access` migration: `ai_access` (approved accounts), `ai_limits` (one row), `ai_usage`, and the `use_ai` and `ai_allowance` functions.
- `src/lib/auth/demo.ts`: the shared demo account (`DEMO_EMAIL`, `DEMO_PASSWORD`, server only); `signInAsDemo` is in `actions.ts`.
- `src/app/manifest.ts`, `src/components/install-hint.tsx`: installing on a phone. `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`: the error pages.
- `src/lib/input.ts`: `parseNumberInput()` (strict numbers, decimal comma) and `isKeyOf()`.
- `src/components/form-field.tsx`: `FormField` and `describedBy()`, used by every form.
- `src/lib/nutrition/`: food schemas, nutrient scaling and summing (`calculate.ts`), plausibility checks (`check.ts`: physical limits, Atwater 4/4/9).
- `src/app/`: `/` dashboard (today's totals and meals; redirects to `/goals` until both goals are set), `/goals`, `/login`, `/signup`, `/auth/confirm` (PKCE code exchange), `/log` (describe a meal or add foods by hand, then save them together), `/meals/[id]` (edit or delete one).
- `supabase/migrations/`: schema as SQL. `supabase/tests/`: RLS and constraint tests in PGlite.

## Conventions

- Domain logic is pure functions with unit tests. Prefer result types (`{ ok: true, … } | { ok: false, … }`) over exceptions. Round only for display.
- Server Actions are public endpoints: call `requireUser()` and validate on the server, with Zod or with the plain parsers a form shares with the browser (`src/lib/meals/form.ts`). Data functions check auth themselves; the proxy is a convenience and RLS is the security boundary.
- Every table has RLS, grants follow least privilege, and policies use `(select auth.uid())`. App limits mirror DB check constraints, and a PGlite test ties the two together.
- Data functions return only the fields pages need, with app names, not column names.
- Forms use `useActionState` with a Server Action. Fields that must survive an error are controlled: React resets forms after submit, and Base UI warns when `defaultValue` changes. When an action's result feeds local state (the log page's cards), call it from an event handler inside `startTransition` instead.
- Number fields use `type="text"` with `inputMode` and strict parsing, never `z.coerce.number()`.
- Keep Zod out of client components; client-side checks are plain functions.
- Every call that costs money takes a use first: `takeAiUse("description")` before the parser, `takeAiUse("lookup")` before the agent. A refusal or a failed check means no call (fail closed). Check what costs nothing (`descriptionProblem()`) before taking a use.
- The LLM only reads text and recalls typical values, never does math. Its answer is untrusted input: a strict schema with types only, then the meal form's rules, food by food.
- The web-search agent reads pages the app does not control. Its values count only after code checks them (`checkPublishedFood`): the page was opened with `web_fetch`, it is on the place's official site, the energy, protein and serving size appear on it, and they are plausible. Never loosen these for a better score.
- Tests never call a real model: use `MockLanguageModelV4` from `ai/test`, or stub `fetch` to check the request sent to the provider. Only `npm run eval` calls a real model, on request, never in CI.
- After changing the parser's instructions, schema or model, run `npm run eval` and compare with the last report.
- Comments explain why, briefly. Prettier formats everything, with LF line endings.
- Mobile-first, phone-width column (`max-w-md`). Check 360 px and dark mode.

## Pitfalls already hit

- Read `node_modules/next/dist/docs/` before using a Next.js API. `LayoutProps` and `PageProps` are global types created by `next typegen`.
- `createClient()` calls `cookies()` before reading env vars, so pages are dynamic and the build needs no Supabase keys.
- On the server, use `getClaims()` (it verifies the JWT), never `getSession()`.
- `z.email().trim()` validates before trimming: use `z.string().trim().pipe(z.email())`.
- Supabase (bcrypt) limits passwords to 72 bytes, not 72 characters.
- `"toString" in {}` is true: use `Object.hasOwn` to check keys.
- Functions named `useX` are treated as hooks by React and the React Compiler.
- Stay on ESLint 9: `eslint-plugin-react` breaks on ESLint 10.
- In Playwright, `[role=alert]` also matches Next's route announcer, and `button[type=submit]` matches the header's Sign out button: scope selectors to `main`. `text=` matches any substring, case-insensitively: use `getByRole` for buttons.
- `pkill -f "next dev"` also kills the shell running it: stop processes by PID.
- The server runs in UTC: compute "today" with `todayIn(timeZone)`, never from `new Date().toISOString()`.
- `formatNumber` shows at most 3 decimals, which already hides floating-point noise; round to display precision with `roundNutrients` after summing.
- "1,200" in a decimal field could be 1200 or 1.2: `parseNumberInput` returns `"ambiguous"` and the form asks.
- Keep a number and its unit together with a non-breaking space (`\u00a0`), or "7.2" and "g" can wrap apart.
- AI SDK 7 differs from older examples: `system` is now `instructions`, and structured output is `generateText` with `output: Output.object(...)`. Read `node_modules/ai/docs/` and `node_modules/@ai-sdk/openai/docs/`.
- OpenAI's strict Structured Outputs need every field: use `.nullable()`, never `.optional()`.
- In this cloud environment, `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` are already set for other tools, and `@ai-sdk/anthropic` reads both by default: the app's key is `APP_ANTHROPIC_API_KEY`, and `model.ts` passes the key and `https://api.anthropic.com/v1` explicitly.
- Keys for this environment go under Environment variables (caret after the session title, then Edit cloud environment). Network secrets never reach `api.anthropic.com`. A new variable shows up in new sessions, or once the session's VM restarts.
- Keep the `ai` and `@ai-sdk/*` packages on matching releases: a provider built on a newer `@ai-sdk/provider` fails the type check.
- Set Claude's effort in `providerOptions.anthropic` (medium, chosen with `npm run eval`). It overrides the top-level `reasoning`, which on Claude also asks for thinking summaries that nothing reads.
- Under a coding agent, Vitest's default reporter hides what passing tests log: the eval config sets `reporters: ["default"]`, or a run where every case passes prints no report.
- Extensions live in the `extensions` schema. Functions with `search_path = ''` must qualify them: `extensions.similarity`, `operator(extensions.%)`, `extensions.gin_trgm_ops`. PGlite loads extensions on request: add a new one to `createTestDatabase()` in `supabase/tests/database.ts`.
- Trigram `word_similarity` scores "Coca-Cola" against "Coca-Cola Zero" as 1.0. Use `similarity`, a high bar and equal numbers before trusting a fuzzy match (`src/lib/foods/cache.ts`).
- Generated types make every column a function returns non-null. Type RPC rows with their real nullability (`SearchRow` in `src/lib/foods/cache.ts`).
- `foods.search_text` is a stored generated column: changing `food_search_text()` needs the column dropped and added again.
- Haiku is sensitive to any new sentence in the parser's instructions: a `place` rule there broke bread, the apple or raw rice, depending on where it went. The same rule as the schema field's `.describe()` broke nothing. Prefer field descriptions for new fields, and measure over several eval runs.
- Without being told to open a page, the agent answered from search snippets and invented values (170 kcal for strips published at 252). It must use `web_fetch`, and the checks reject answers from pages it never opened.
- Web search needs the organization's setting in the Anthropic Console (Settings → Privacy). A lookup costs 1 cent per search plus the pages read: `maxContentTokens` caps a long PDF.
- Restaurants publish per country: KFC Romania's strips weigh 30 g, elsewhere up to 47 g. Eval ranges for chains come from the Romanian site, with the source in a comment.
- Browsers fetch the web app manifest without cookies: `/manifest.webmanifest` is public in `src/lib/auth/routes.ts`, or the proxy would send it to `/login` and phones could not install the app.
- A flag users must not set never goes in `profiles`, which they may update: it gets its own table with no user grants, read through a `security definer` function (`ai_access`).
- Windows PowerShell 5.1 reads a `.ps1` without a BOM in the system code page: keep `scripts/run.ps1` ASCII-only. `.cmd` and `.ps1` files are CRLF (`.gitattributes`); everything else LF.
- On Windows, Node cannot spawn `npm` (a `.cmd`) without `shell: true`. Run Next and the Supabase CLI with `process.execPath` and their JS entry files instead: no shell, same on every system.
- `readline/promises` `question()` loses piped lines that arrive before it is called: read answers through the interface's async iterator (`scripts/start.mjs`).
- For a serving, the model sometimes gives the values of 100 g, mostly at low effort. Telling it that a serving's values are for the whole serving only moved the mix-up to other foods (README, Baseline). Judge instruction changes over several eval runs, at the effort the app uses.

## Verifying changes

- Unit tests, then mutation testing: break the code on purpose, confirm a test fails, restore it.
- End-to-end on a local Supabase (Docker works in the cloud container):
  1. Start `dockerd` in the background.
  2. `npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api`
  3. Write `.env.local` from `npx supabase status -o env` (local keys only): it overrides the shared project in `.env`. Delete it when done.
  4. Run `next dev` and drive the flows with Playwright (`/opt/node22/lib/node_modules/playwright`). Confirmation emails arrive in Mailpit at `http://127.0.0.1:54324`.
     With `APP_ANTHROPIC_API_KEY` set, the AI flow runs on real Claude, at well under a cent per description. To test the cache, add catalog rows as the server would, through `docker exec -i supabase_db_ai-nutrition-calculator psql -U postgres`: rows without `created_by` form the shared catalog.
     To test the AI flow without a key, run a small fake of the Responses API (canned answers by keyword) and add `OPENAI_API_KEY=sk-fake` and `OPENAI_BASE_URL=http://127.0.0.1:4010/v1` to `.env.local`: the OpenAI provider reads `OPENAI_BASE_URL`.
  5. Run `npx supabase stop` when done.
- Take screenshots at 360 and 390 px, in light and dark mode.

## Roadmap

- Done:
  - Stage 0, setup and CI.
  - Stage 1, nutrition math.
  - Stage 2, schema with RLS and email sign-in.
  - Task 3.1, onboarding with daily goals.
  - Task 3.2, goals calculator.
  - Task 3.3, dashboard progress and today's meal list from real entries.
  - Task 3.4, add, edit and delete meals manually (works without AI).
  - Task 4.1, the meal parser: AI SDK + OpenAI with a strict schema.
  - Task 4.2, the log page: a description becomes editable cards, saved together.
  - Task 4.3, the eval set: 22 descriptions graded through the app's own rules (`npm run eval`).
  - Task 4.4, the eval baseline in the README: Claude Haiku 5.5 passes 21 or 22 of 22.
  - Task 5.1, a cache in `foods` with fuzzy search (`pg_trgm`).
  - Final build, PR 1: the web-search agent. A food whose description names a restaurant or shop gets that place's published values, checked in code and kept in the cache as the user's own food. 25 eval cases; the baseline is in the README.
  - Final build, PR 2: launch readiness. The AI only for approved accounts (`ai_access`), daily limits per user and for everyone (`ai_limits`, defaults 30/10 and 200/20), a shared demo account, installing on a phone, error pages.
  - Final build, PR 1.1: setup in two steps on Windows (download, double-click `start.cmd`), and one Supabase project for every copy (Augustin's choice: one project, Windows only, Node installed by winget after asking).
- Final build (Augustin's plan, November 2026): three PRs that close a usable app; updates come later.
  - PR 3 (next): deploy on Vercel, with a step-by-step checklist for what only Augustin can do (Vercel project, production Supabase and `supabase db push`, environment variables, auth URLs, web search on in the Console, a separate API key with a monthly limit). Then a smoke test on the live site and the portfolio README.
- Later, as updates: matching cached foods on the official product name (the parser names a food differently from one description to the next); USDA FoodData Central; Open Food Facts; source badges; moving to OpenAI once its key is in place; Google sign-in; Phase 2 (charts and history, barcode scanning, a Python FastAPI service for predictions). Augustin has about 3 USD of Anthropic credit: an eval run costs under a cent, a web lookup 1.5 to 5 cents.
