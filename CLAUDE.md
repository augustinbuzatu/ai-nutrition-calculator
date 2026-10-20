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
- Never ask for keys, tokens or passwords in the chat. The `sb_secret_` key and `OPENAI_API_KEY` never go into code, `NEXT_PUBLIC_` variables, the chat or GitHub. `.env.local` is gitignored.

## Stack

Next.js 16 (App Router, Server Components, Server Actions, React Compiler) · React 19 · TypeScript (strict) · Tailwind CSS v4 (configured in CSS) · shadcn/ui (base-nova, Base UI primitives) · Zod 4 · Supabase (Postgres with RLS, Auth with email and password, `@supabase/ssr`) · Vercel AI SDK 7 + OpenAI (`gpt-6-luna`) · Vitest · PGlite · ESLint 9 · Prettier · GitHub Actions.

## Commands

`npm ci` · `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` (runs `next typegen` first) · `npm test` · `npm run format` / `format:check` · `npm run db:types` (regenerates `src/lib/supabase/database.types.ts` from the linked project) · `npm run eval` (grades the parser against the real model; needs `OPENAI_API_KEY`).

CI runs `format:check`, `lint`, `typecheck`, `test` and `build`. Run all five before pushing; `build` must pass without `.env.local`.

## Where things are

- `src/proxy.ts`: Next 16's name for middleware. Refreshes the Supabase session and sends signed-out visitors to `/login` (rules in `src/lib/auth/routes.ts`).
- `src/lib/supabase/`: `createClient()` for the server, env config, generated database types.
- `src/lib/auth/`: Server Actions (sign in, sign up, sign out), credential validation and error messages, `getCurrentUser()` / `requireUser()`.
- `src/lib/profile.ts`: `getProfile()` (goals and time zone), cached per request.
- `src/lib/goals/`: limits (mirror the DB constraints), Zod schema, `getGoals()`, `saveGoals()`, and `estimate.ts` (Mifflin-St Jeor calculator, browser only).
- `src/lib/diary/`: `todayIn()` (today's date in the user's time zone), progress status for the stat tiles, `getTodaysDiary()`.
- `src/lib/meals/`: the meal form's rules (`form.ts`, shared by the browser preview and the server), `submission.ts` (reads the log page's cards on the server, with Zod), `getMeal()`, and the `addMeals` / `updateMeal` / `deleteMeal` Server Actions.
- `src/lib/parser/`: `parseMealDescription()` turns a description into the meal form's fields, one set per food, with OpenAI; the model's instructions are in `instructions.ts`. `describeMeal` is its Server Action, and `isParserConfigured()` checks for the key.
- `evals/`: the parser's eval set (`cases.ts`, with USDA-based ranges), the grader (`grade.ts`, unit-tested in `npm test`) and the runner (`parser.eval.ts`, its own Vitest config).
- `src/components/log-meal-form.tsx` and `meal-card.tsx`: the log page, where a description becomes one editable card per food.
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
- The LLM only reads text and recalls typical values, never does math. Its answer is untrusted input: a strict schema with types only, then the meal form's rules, food by food.
- Tests never call a real model: use `MockLanguageModelV4` from `ai/test`, or stub `fetch` to check the request sent to OpenAI. Only `npm run eval` calls OpenAI, on request, never in CI.
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

## Verifying changes

- Unit tests, then mutation testing: break the code on purpose, confirm a test fails, restore it.
- End-to-end on a local Supabase (Docker works in the cloud container):
  1. Start `dockerd` in the background.
  2. `npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api`
  3. Write `.env.local` from `npx supabase status -o env` (local keys only).
  4. Run `next dev` and drive the flows with Playwright (`/opt/node22/lib/node_modules/playwright`). Confirmation emails arrive in Mailpit at `http://127.0.0.1:54324`.
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
- Stage 4, AI parser:
  - Next: run `npm run eval` with Augustin's key, record the baseline in the README, and tune the instructions where cases fail.
- Stage 5, real data sources:
  - 5.1: a cache in `foods` with fuzzy search (`pg_trgm`).
  - 5.2: USDA FoodData Central.
  - 5.3: Open Food Facts.
  - 5.4: a web-search agent for restaurants (e.g. KFC).
  - 5.5: source badges in the UI.
- Stage 6, launch:
  - 6.1: deploy on Vercel. First, limit AI calls per user per day: anyone can sign up, and each call costs money. Augustin chose a demo account for recruiters; keys stay on the server (no bring-your-own-key for now).
  - 6.2: PWA.
  - 6.3: portfolio README.
- Later: Google sign-in; Phase 2 (charts and history, barcode scanning, a Python FastAPI service for predictions).
