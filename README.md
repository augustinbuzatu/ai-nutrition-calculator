# AI Nutrition Calculator

[![CI](https://github.com/augustinbuzatu/ai-nutrition-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/augustinbuzatu/ai-nutrition-calculator/actions/workflows/ci.yml)

Log your meals in plain language, in English or Romanian, and get accurate calories and macros.

> _"I had 150 g of grilled chicken breast and 200 g of cooked rice"_
> _"am mâncat 3 crispy de la KFC"_

## How it works

LLMs are great at understanding language and bad at arithmetic, so this app splits the job:

1. **Parse**: an LLM turns free text into structured data (food, brand, quantity, unit), enforced with Structured Outputs and validated with Zod.
2. **Resolve**: nutrition values come from trusted sources: a local cache, USDA FoodData Central, Open Food Facts, and official restaurant data found through web search.
3. **Validate**: every value is checked against physical limits and the Atwater factors (4/4/9 kcal per gram of protein/carbs/fat).
4. **Calculate**: all math is done by deterministic, unit-tested TypeScript. The model never does arithmetic.

## Tech stack

- **Now:** Next.js 16 (App Router, Server Actions, React Compiler) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · Supabase (PostgreSQL with Row Level Security, Auth with email and password) · Vitest · PGlite · ESLint · Prettier · GitHub Actions
- **Planned:** Google sign-in · Vercel AI SDK + OpenAI · Vercel

## Getting started

Requires Node.js 20.9 or newer and a [Supabase](https://supabase.com) project (the free plan is enough).

1. Install the dependencies:

   ```bash
   npm ci
   ```

2. Create the tables in your Supabase project:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. Copy `.env.example` to `.env.local` and fill in your project's URL and **publishable** key (Dashboard → Project Settings → API Keys). Never use the secret key here.

4. In the dashboard, under Authentication → URL Configuration, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to the Redirect URLs, so the link in the confirmation email can come back to the app.

5. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Scripts

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Starts the development server with hot reload                       |
| `npm run build`     | Creates the production build                                        |
| `npm run lint`      | Runs ESLint                                                         |
| `npm run typecheck` | Generates route types, then runs the TypeScript compiler            |
| `npm test`          | Runs the unit tests once (`npm run test:watch` reruns them on save) |
| `npm run format`    | Formats every file with Prettier (`format:check` only checks)       |
| `npm run db:types`  | Regenerates the database types from the linked Supabase project     |

CI runs `format:check`, `lint`, `typecheck`, `test` and `build` on every push and pull request.

## Database

The schema lives in `supabase/migrations/` as plain SQL, versioned with the code:

- `profiles`: one per user, created at sign-up; daily goals stay empty until onboarding.
- `foods`: nutrition facts as published (per 100 g, per 100 ml or per serving), either in the shared catalog or private to one user.
- `food_entries`: the food diary, stored as snapshots so later catalog edits never rewrite history.

Row Level Security limits every query to the signed-in user's own rows. `supabase/tests/` runs the migrations in [PGlite](https://pglite.dev) (Postgres in WebAssembly) and checks those rules on every CI run, with no Docker or Supabase project needed.

`src/lib/supabase/database.types.ts` is generated from the schema (`npm run db:types`), so a typo in a table or column name fails the type check instead of failing at runtime.

## Authentication

Email and password sign-in with Supabase Auth, kept in cookies so Server Components can read the session:

- `src/proxy.ts` runs before every page: it refreshes the session and sends visitors who are not signed in to `/login`.
- Sign-in, sign-up and sign-out are Server Actions that validate their input with Zod on the server.
- New accounts confirm their email first; the link lands on `/auth/confirm`, which exchanges its one-time code for a session.

The proxy is a convenience, not the security boundary: the database checks every query with Row Level Security, whatever the app does.

## Status

Work in progress: Phase 1 (MVP). What works today:

- Sign up and sign in with email and password.
- Onboarding: at first sign-in, users set their daily calorie and protein goals (and can change them later). The dashboard shows them.
- A goals calculator estimates both from age, height, weight and activity (Mifflin-St Jeor equation). It runs in the browser and saves nothing.
- The dashboard shows today's calories and protein against the goals, with progress bars, and lists today's meals. "Today" follows the user's time zone, not the server's.
- Meals can be added by hand from a label or a menu (values per 100 g, per 100 ml or per serving), with a live preview and plausibility checks, then edited or deleted.

Next: logging meals in plain language, with an LLM that turns the text into the same form.
