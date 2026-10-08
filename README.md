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

- **Now:** Next.js 16 (App Router, React Compiler) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · PostgreSQL schema with Row Level Security (Supabase migrations) · Vitest · PGlite · ESLint · Prettier · GitHub Actions
- **Planned:** Supabase Auth and hosting · Vercel AI SDK + OpenAI · Vercel

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Starts the development server with hot reload                       |
| `npm run build`     | Creates the production build                                        |
| `npm run lint`      | Runs ESLint                                                         |
| `npm run typecheck` | Generates route types, then runs the TypeScript compiler            |
| `npm test`          | Runs the unit tests once (`npm run test:watch` reruns them on save) |
| `npm run format`    | Formats every file with Prettier (`format:check` only checks)       |

CI runs `format:check`, `lint`, `typecheck`, `test` and `build` on every push and pull request.

## Database

The schema lives in `supabase/migrations/` as plain SQL, versioned with the code:

- `profiles`: one per user, created at sign-up; daily goals stay empty until onboarding.
- `foods`: nutrition facts as published (per 100 g, per 100 ml or per serving), either in the shared catalog or private to one user.
- `food_entries`: the food diary, stored as snapshots so later catalog edits never rewrite history.

Row Level Security limits every query to the signed-in user's own rows. `supabase/tests/` runs the migrations in [PGlite](https://pglite.dev) (Postgres in WebAssembly) and checks those rules on every CI run, with no Docker or Supabase project needed.

## Status

Work in progress: Phase 1 (MVP).
