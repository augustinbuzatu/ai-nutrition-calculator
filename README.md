# AI Nutrition Calculator

[![CI](https://github.com/augustinbuzatu/ai-nutrition-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/augustinbuzatu/ai-nutrition-calculator/actions/workflows/ci.yml)

Log your meals in plain language, in English or Romanian, and get accurate calories and macros.

> _"I had 150 g of grilled chicken breast and 200 g of cooked rice"_
> _"am mâncat 3 crispy de la KFC"_

## How it works

LLMs are great at understanding language and bad at arithmetic, so this app splits the job:

1. **Parse**: an LLM turns free text into structured data (food, amount, unit), enforced with Structured Outputs and validated with Zod.
2. **Resolve**: nutrition values come from trusted sources: a local cache, USDA FoodData Central, Open Food Facts, and official restaurant data found through web search. Until those are wired in, the LLM estimates typical values, and step 3 checks them.
3. **Validate**: every value is checked against physical limits and the Atwater factors (4/4/9 kcal per gram of protein/carbs/fat).
4. **Calculate**: all math is done by deterministic, unit-tested TypeScript. The model never does arithmetic.

## Tech stack

- **Now:** Next.js 16 (App Router, Server Actions, React Compiler) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · Supabase (PostgreSQL with Row Level Security, Auth with email and password) · Vercel AI SDK + OpenAI (Claude Haiku for now) · Vitest · PGlite · ESLint · Prettier · GitHub Actions
- **Planned:** Google sign-in · Vercel

## Getting started

Requires Node.js 22 or newer and a [Supabase](https://supabase.com) project (the free plan is enough).

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

   To describe meals in words, also add an [OpenAI API key](https://platform.openai.com/api-keys) as `OPENAI_API_KEY`, and set a monthly budget for it under Settings → Limits. An [Anthropic key](https://console.anthropic.com/settings/keys) as `APP_ANTHROPIC_API_KEY` works too, with Claude Haiku; OpenAI wins when both are set. Everything else works without either.

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
| `npm run eval`      | Grades the meal parser against the real model (needs an API key)    |

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

## Meal parser

`src/lib/parser/` turns a description such as _"150 g piept de pui și 2 ouă"_ into the fields of the manual meal form, one set per food, so the same rules check what the model says and what a person types.

- The model (OpenAI's `gpt-6-luna`, or Claude Haiku 5.5 until the OpenAI key is in place, through the Vercel AI SDK) reads the text and gives, for each food, a name, an amount, a unit and typical values per 100 g, per 100 ml or per serving. It never multiplies: the calculator does.
- Structured Outputs in strict mode make the answer match a Zod schema. The schema has types only: limits and plausibility are checked food by food afterwards, so one odd value does not throw away the rest.
- The model gives only the unit; the basis (per 100 g, per 100 ml or per serving) follows from it, so the two can never disagree.
- The description is sent as the user's message, apart from the instructions. Requests set `store: false`, so OpenAI does not keep the response, and cap the answer at 4,000 tokens. Claude runs at medium effort: at low, it sometimes gave a whole serving the values per 100 g, and passed 18 to 20 of the 22 eval cases, against 21 or 22 at medium.
- The tests replace the model with the AI SDK's mock, and `fetch` with a fake OpenAI or Anthropic API, so they run offline and for free, and check the exact request the app sends.
- Switching providers is one line, since the AI SDK keeps the rest of the code the same. The Anthropic provider gets its key and address explicitly, never from `ANTHROPIC_API_KEY` or `ANTHROPIC_BASE_URL`: hosted dev environments often set those for other tools.

On the log page, each food the parser finds becomes a card to check. A card shows the estimate folded, with what the model assumed ("Assumed cooked weight."), and opens by itself when something needs fixing. Foods can also be added by hand, and without an API key that is all the page offers. All the cards are saved together, in one `INSERT`, and each keeps the description it came from, to evaluate the parser later.

## Evals

Unit tests prove the code around the model works; they cannot tell whether the model reads meals well. `npm run eval` sends 22 descriptions to the real model and grades each answer the way the app would use it, through the meal form's rules and the calculator:

- **Structure:** the right number of foods, and the amount when the description states it (150 g stays 150 g, "2 ouă" is 2 servings).
- **Values:** what each food adds, in kcal and protein, within a range built from USDA FoodData Central values. The ranges are wide on purpose, to catch gross errors (kJ for kcal, raw rice read as cooked, a portion counted twice), not a few percent.
- **Hard cases:** Romanian dishes (mici, sarmale, ciorbă de burtă), decimal commas, household measures, restaurants, text that tries to give the model orders, and text with no food at all.

The report lists what the model found for each case, then the score, the tokens, the cost and the time per call. `EVAL_MODEL=claude-opus-5-5 npm run eval` compares another model, from either provider. The evals never run in CI: they cost money and their answers vary from run to run. The grading code itself is unit-tested.

## Status

Work in progress: Phase 1 (MVP). What works today:

- Sign up and sign in with email and password.
- Onboarding: at first sign-in, users set their daily calorie and protein goals (and can change them later). The dashboard shows them.
- A goals calculator estimates both from age, height, weight and activity (Mifflin-St Jeor equation). It runs in the browser and saves nothing.
- The dashboard shows today's calories and protein against the goals, with progress bars, and lists today's meals. "Today" follows the user's time zone, not the server's.
- Meals can be described in plain language, in English or Romanian: each food becomes an editable card with the estimated values, and nothing is saved until the user confirms.
- Foods can also be added by hand from a label or a menu (values per 100 g, per 100 ml or per serving), with a live preview and plausibility checks, then edited or deleted.

Next: the parser's first eval baseline, then nutrition values from real sources.
