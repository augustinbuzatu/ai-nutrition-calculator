# AI Nutrition Calculator

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

- **Now:** Next.js 16 (App Router, React Compiler) · TypeScript · Tailwind CSS v4 · ESLint
- **Planned:** Supabase (PostgreSQL, Auth, Row Level Security) · Vercel AI SDK + OpenAI · Vitest · GitHub Actions · Vercel

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Status

Work in progress: Phase 1 (MVP).
