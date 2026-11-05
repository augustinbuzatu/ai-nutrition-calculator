# AI Nutrition Calculator

[![CI](https://github.com/augustinbuzatu/ai-nutrition-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/augustinbuzatu/ai-nutrition-calculator/actions/workflows/ci.yml)

Log your meals in plain language, in English or Romanian, and get accurate calories and macros.

> _"I had 150 g of grilled chicken breast and 200 g of cooked rice"_
> _"am mâncat 3 crispy de la KFC"_

## How it works

LLMs are great at understanding language and bad at arithmetic, so this app splits the job:

1. **Parse**: an LLM turns free text into structured data (food, amount, unit), enforced with Structured Outputs and validated with Zod.
2. **Resolve**: nutrition values come from trusted sources: a local cache, official restaurant and shop data found through web search, USDA FoodData Central and Open Food Facts. The cache and the web search are wired in: a food from a restaurant or shop the description names gets the values that place publishes. Other food is still estimated by the LLM, and step 3 checks it.
3. **Validate**: every value is checked against physical limits and the Atwater factors (4/4/9 kcal per gram of protein/carbs/fat).
4. **Calculate**: all math is done by deterministic, unit-tested TypeScript. The model never does arithmetic.

## Tech stack

- **Now:** Next.js 16 (App Router, Server Actions, React Compiler) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · Supabase (PostgreSQL with Row Level Security, Auth with email and password) · Vercel AI SDK + OpenAI (Claude Haiku for now) · Vitest · PGlite · ESLint · Prettier · GitHub Actions
- **Planned:** Google sign-in · Vercel

## Getting started

On Windows, two steps:

1. Get the code: on GitHub, **Code → Download ZIP**, and unzip it. Or `git clone` it.
2. Double-click **`start.cmd`**. In VS Code, **Ctrl+Shift+B** does the same. It:
   - installs Node.js with winget, after asking, if it is missing or older than 22;
   - installs the dependencies, the first time and whenever they change;
   - the first time, asks for an Anthropic API key, which stays on that computer in `.env.local`; press Enter to skip it, and meals are added by hand;
   - starts the app and opens [http://localhost:3000](http://localhost:3000).

   If Windows asks whether to run a file from the internet, choose to run it.

On macOS or Linux, install Node.js 22 or newer, then run `npm run app`.

There is no Supabase account to create: every copy uses the maintainer's Supabase project, whose public settings are committed in `.env`. The publishable key there only allows what row level security allows, and a test keeps secrets out of that file.

### For the maintainer

- **New migrations:** double-click `update-database.cmd`, or run `npm run db:push`. The first time it signs in to Supabase in the browser and asks for the database password. Then it links the project named in `.env` and applies `supabase/migrations/`.
- **The Supabase dashboard,** under Authentication → URL Configuration: the Site URL, and `http://localhost:3000/**` among the Redirect URLs, so confirmation emails come back to local copies.
- **The Anthropic Console:** web search on (Settings → Privacy), for the restaurant and shop lookups, and a monthly spend limit.

## Scripts

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run app`       | What `start.cmd` runs: checks, installs, and starts the app         |
| `npm run dev`       | Starts the development server with hot reload                       |
| `npm run build`     | Creates the production build                                        |
| `npm run lint`      | Runs ESLint                                                         |
| `npm run typecheck` | Generates route types, then runs the TypeScript compiler            |
| `npm test`          | Runs the unit tests once (`npm run test:watch` reruns them on save) |
| `npm run format`    | Formats every file with Prettier (`format:check` only checks)       |
| `npm run db:push`   | Applies new migrations to the project in `.env` (maintainer)        |
| `npm run db:types`  | Regenerates the database types from the linked Supabase project     |
| `npm run eval`      | Grades the meal parser against the real model (needs an API key)    |

CI runs `format:check`, `lint`, `typecheck`, `test` and `build` on every push and pull request.

## Database

The schema lives in `supabase/migrations/` as plain SQL, versioned with the code:

- `profiles`: one per user, created at sign-up; daily goals stay empty until onboarding.
- `foods`: nutrition facts as published (per 100 g, per 100 ml or per serving), either in the shared catalog or private to one user, searched by name with `search_foods` (see Foods cache).
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

## Foods cache and web search

`src/lib/foods/` is step 2: before a card shows the model's estimate, the `foods` table is searched for the same food, and a restaurant's or shop's site after that. The table holds nutrition facts as their source publishes them; rows without an owner form a shared catalog that only the server writes.

- **Fuzzy search with `pg_trgm`.** Names are compared by their three-letter pieces, after removing diacritics (`unaccent`), case and apostrophes. So "crispy strips kfc" finds "KFC Crispy Strips", and "ciorba de burta" finds "Ciorbă de burtă". A trigram index keeps the search fast as the cache grows, and `search_foods` runs as the caller, so RLS still decides which foods a user sees.
- **A strict bar for using a match.** A wrong match is worse than an estimate. A cached food replaces the model's values only when its name is at least 0.8 alike, has the same numbers ("Lapte 1,5%" is not "Lapte 3,5%"), and has values that fit the amount (per 100 g for grams, per serving for servings). On real names, "KFC Crispy Strip" and "KFC Crispy Strips" score 0.84, "Coca-Cola" and "Coca-Cola Zero" 0.62.
- **The card names the source** ("Values from kfc.ro."). If the cache cannot be searched, every food keeps its estimate.

### Looking food up on the place's own site

When the description names a restaurant or shop ("3 bucăți de pui de la KFC"), the parser marks it as the food's `place`. "O farfurie mare de pui" has none and stays an estimate. If the cache does not hold the food, Claude Haiku 5.5 looks it up:

- **It searches the place's official site**, when the app knows it (kfc.ro, mcdonalds.ro, mega-image.ro, lidl.ro and others in `places.ts`), and the whole web otherwise. Then it opens the product's page or the restaurant's nutrition PDF with `web_fetch`, and reports the values exactly as published.
- **The app checks the answer, in code.** Pages it reads are untrusted, so instructions alone are not enough. The values count only when:
  - the agent opened the page it names as the source;
  - the page is on the place's official site;
  - the energy, protein and serving size it reports appear on that page;
  - they pass the same plausibility checks as the meal form.

  The check exists because, in testing, the agent once answered from search snippets with 170 kcal per 100 g for strips that KFC publishes at 252.

- **The app does the math.** KFC Romania publishes its chicken per 100 g and one piece as 75 g, so the app works out one piece: 186 kcal. The model never converts.
- **The values are kept in the cache**, as the user's own food. The next time, the same food takes about 3 seconds instead of 10 to 20, and costs nothing. Private, so a wrong value found for one user never reaches another.
- **Cost:** a new lookup costs about 1.5 to 5 US cents (a search is 1 cent, plus the pages read). If nothing is found, the card keeps the estimate and says so ("Not found on kfc.ro, so the values are estimated.").

A known limit: the parser names the same food a little differently from one description to the next ("Pui KFC", "Pui KFC Original Recipe"), and below the 0.8 bar the cache misses it, so the agent searches again. Matching on the official product name the agent found would fix that.

USDA FoodData Central and Open Food Facts will also fill the cache later. The evals call the parser directly, so they still grade the model alone.

## Evals

Unit tests prove the code around the model works; they cannot tell whether the model reads meals well. `npm run eval` sends 25 descriptions to the real model and grades each answer the way the app would use it, through the meal form's rules and the calculator:

- **Structure:** the right number of foods, and the amount when the description states it (150 g stays 150 g, "2 ouă" is 2 servings).
- **Values:** what each food adds, in kcal and protein, within a range built from USDA FoodData Central values. The ranges are wide on purpose, to catch gross errors (kJ for kcal, raw rice read as cooked, a portion counted twice), not a few percent.
- **Hard cases:** Romanian dishes (mici, sarmale, ciorbă de burtă), decimal commas, household measures, restaurants and shops (whose names decide where to search), text that tries to give the model orders, and text with no food at all.

The report lists what the model found for each case, with what one serving is ("2 servings of “1 ou”"), then the score, the tokens, the cost and the time per call. `EVAL_MODEL=claude-opus-5-5 npm run eval` compares another model, from either provider. The evals never run in CI: they cost money and their answers vary from run to run. The grading code itself is unit-tested.

### Baseline

Claude Haiku 5.5 at medium effort, November 2026, 25 cases over 6 runs:

| Cases passed (of 25)                    | Cost per run | Time per call (average) |
| --------------------------------------- | ------------ | ----------------------- |
| 25 in 3 runs, 24 in 2 runs, 23 in 1 run | about $0.007 | 2.1 s                   |

The parser also names the restaurant or shop a food comes from (`place`), which decides whether its site is searched. It was right in every case of every run: KFC, McDonald's for a Big Mac, Mega Image, and none for a home-made plate or a can of Coke.

What still fails, now and then:

- **Chicken breast with the values of raw meat**, in "150 g chicken breast and 200 g cooked rice" (1 run of 6).
- **Values per 100 g given for a whole serving** (1 run of 6): two eggs at 310 kcal instead of about 155. At low effort this happens in most runs, which is why the parser runs at medium.
- **3 pieces of KFC chicken a little under the range** (1 run of 6): 390 kcal, where KFC Romania publishes 558. In the app, the web search replaces that estimate with KFC's own values.
- **A serving label over the form's 50 characters** (1 run of 6), which the card then asks to shorten.

The KFC Crispy Strips case used to fail. Its range came from strips sold elsewhere, at up to 47 g each. When the web search first read kfc.ro, it found that KFC Romania's strips weigh 30 g: 227 kcal and 17.8 g protein for three. The model's 21 g estimate had been closer than the eval, so the range now follows KFC Romania's published values.

**Where the `place` rule goes matters.** Haiku turned out to be sensitive to any new sentence in its instructions:

| Where the rule went                       | What it broke, on the old cases       |
| ----------------------------------------- | ------------------------------------- |
| a new line in the list of fields          | bread at 100 g per slice, 2 of 3 runs |
| a shorter line, same place                | the apple, 4 of 6 runs                |
| a last paragraph                          | raw rice read as cooked, 3 of 3 runs  |
| nowhere (control)                         | nothing, but places mostly missed     |
| **the field's description in the schema** | **nothing new, places all found**     |

The rule now lives in the JSON schema, next to the field it describes.

Telling the model that a serving's values are for the whole serving did not help. At medium effort, the score stayed the same (21.2 on average over 5 runs). At low effort, the mix-up moved from the apple to a portion of sarmale at 190 kcal, about the value of 100 g. The instructions stay as they were.

## Status

Work in progress: Phase 1 (MVP). What works today:

- Sign up and sign in with email and password.
- Onboarding: at first sign-in, users set their daily calorie and protein goals (and can change them later). The dashboard shows them.
- A goals calculator estimates both from age, height, weight and activity (Mifflin-St Jeor equation). It runs in the browser and saves nothing.
- The dashboard shows today's calories and protein against the goals, with progress bars, and lists today's meals. "Today" follows the user's time zone, not the server's.
- Meals can be described in plain language, in English or Romanian: each food becomes an editable card with the estimated values, and nothing is saved until the user confirms.
- Foods can also be added by hand from a label or a menu (values per 100 g, per 100 ml or per serving), with a live preview and plausibility checks, then edited or deleted.
- A foods cache with fuzzy search: when it holds the same food, its published values replace the model's estimate.
- Food from a restaurant or shop the description names gets the values that place publishes, read from its site and kept in a cache; anything else is estimated.

Next: getting ready for launch (AI only for approved accounts, daily limits, a demo account, installing on a phone), then the deploy.
