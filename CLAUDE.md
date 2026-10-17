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
- Never ask for keys, tokens or passwords in the chat. The `sb_secret_` key never goes into code, `NEXT_PUBLIC_` variables, the chat or GitHub. `.env.local` is gitignored.

## Stack

Next.js 16 (App Router, Server Components, Server Actions, React Compiler) · React 19 · TypeScript (strict) · Tailwind CSS v4 (configured in CSS) · shadcn/ui (base-nova, Base UI primitives) · Zod 4 · Supabase (Postgres with RLS, Auth with email and password, `@supabase/ssr`) · Vitest · PGlite · ESLint 9 · Prettier · GitHub Actions.

## Commands

`npm ci` · `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` (runs `next typegen` first) · `npm test` · `npm run format` / `format:check` · `npm run db:types` (regenerates `src/lib/supabase/database.types.ts` from the linked project).

CI runs `format:check`, `lint`, `typecheck`, `test` and `build`. Run all five before pushing; `build` must pass without `.env.local`.

## Where things are

- `src/proxy.ts`: Next 16's name for middleware. Refreshes the Supabase session and sends signed-out visitors to `/login` (rules in `src/lib/auth/routes.ts`).
- `src/lib/supabase/`: `createClient()` for the server, env config, generated database types.
- `src/lib/auth/`: Server Actions (sign in, sign up, sign out), credential validation and error messages, `getCurrentUser()` / `requireUser()`.
- `src/lib/profile.ts`: `getProfile()` (goals and time zone), cached per request.
- `src/lib/goals/`: limits (mirror the DB constraints), Zod schema, `getGoals()`, `saveGoals()`, and `estimate.ts` (Mifflin-St Jeor calculator, browser only).
- `src/lib/diary/`: `todayIn()` (today's date in the user's time zone), progress status for the stat tiles, `getTodaysDiary()`.
- `src/lib/meals/`: the meal form's rules (`form.ts`, shared by the browser preview and the server), `getMeal()`, and the `addMeal` / `updateMeal` / `deleteMeal` Server Actions.
- `src/lib/input.ts`: `parseNumberInput()` (strict numbers, decimal comma) and `isKeyOf()`.
- `src/components/form-field.tsx`: `FormField` and `describedBy()`, used by every form.
- `src/lib/nutrition/`: food schemas, nutrient scaling and summing (`calculate.ts`), plausibility checks (`check.ts`: physical limits, Atwater 4/4/9).
- `src/app/`: `/` dashboard (today's totals and meals; redirects to `/goals` until both goals are set), `/goals`, `/login`, `/signup`, `/auth/confirm` (PKCE code exchange), `/log` (add a meal), `/meals/[id]` (edit or delete one).
- `supabase/migrations/`: schema as SQL. `supabase/tests/`: RLS and constraint tests in PGlite.

## Conventions

- Domain logic is pure functions with unit tests. Prefer result types (`{ ok: true, … } | { ok: false, … }`) over exceptions. Round only for display.
- Server Actions are public endpoints: call `requireUser()` and validate on the server, with Zod or with the plain parsers a form shares with the browser (`src/lib/meals/form.ts`). Data functions check auth themselves; the proxy is a convenience and RLS is the security boundary.
- Every table has RLS, grants follow least privilege, and policies use `(select auth.uid())`. App limits mirror DB check constraints, and a PGlite test ties the two together.
- Data functions return only the fields pages need, with app names, not column names.
- Forms use `useActionState` with a Server Action. Fields that must survive an error are controlled: React resets forms after submit, and Base UI warns when `defaultValue` changes.
- Number fields use `type="text"` with `inputMode` and strict parsing, never `z.coerce.number()`.
- Keep Zod out of client components; client-side checks are plain functions.
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
- In Playwright, `[role=alert]` also matches Next's route announcer, and `button[type=submit]` matches the header's Sign out button: scope selectors to `main`.
- `pkill -f "next dev"` also kills the shell running it: stop processes by PID.
- The server runs in UTC: compute "today" with `todayIn(timeZone)`, never from `new Date().toISOString()`.
- `formatNumber` shows at most 3 decimals, which already hides floating-point noise; round to display precision with `roundNutrients` after summing.
- "1,200" in a decimal field could be 1200 or 1.2: `parseNumberInput` returns `"ambiguous"` and the form asks.
- Keep a number and its unit together with a non-breaking space (`\u00a0`), or "7.2" and "g" can wrap apart.

## Verifying changes

- Unit tests, then mutation testing: break the code on purpose, confirm a test fails, restore it.
- End-to-end on a local Supabase (Docker works in the cloud container):
  1. Start `dockerd` in the background.
  2. `npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api`
  3. Write `.env.local` from `npx supabase status -o env` (local keys only).
  4. Run `next dev` and drive the flows with Playwright (`/opt/node22/lib/node_modules/playwright`). Confirmation emails arrive in Mailpit at `http://127.0.0.1:54324`.
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
- Stage 4, AI parser:
  - 4.1: AI SDK + OpenAI with a parser schema.
  - 4.2: the "+" button turns text into editable confirmation cards, then saves them.
  - 4.3: an eval set of about 20 test sentences.
- Stage 5, real data sources:
  - 5.1: a cache in `foods` with fuzzy search (`pg_trgm`).
  - 5.2: USDA FoodData Central.
  - 5.3: Open Food Facts.
  - 5.4: a web-search agent for restaurants (e.g. KFC).
  - 5.5: source badges in the UI.
- Stage 6, launch:
  - 6.1: deploy on Vercel.
  - 6.2: PWA.
  - 6.3: portfolio README.
- Later: Google sign-in; Phase 2 (charts and history, barcode scanning, a Python FastAPI service for predictions).
